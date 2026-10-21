/**
 * Kit state in IndexedDB (SPEC K9, K15; PLAN 3.9). Everything stays on the device.
 *
 * Keys in createStore('sahisize', 'kv'):
 *  - `kit:v1:{slug}`     -> KitState
 *  - `feedback:pending`  -> FeedbackPending (K15)
 *
 * Writes are debounced 300 ms. Without IndexedDB (private mode, blocked storage) an
 * in-memory map is used and `isPersistent()` returns false so the UI can show a banner.
 */
import { createStore, del, get, keys, set, type UseStore } from 'idb-keyval';
import type { FitCheck, FitStage, FitWarning, NameDate } from '@/engine/types';

export const KIT_PREFIX = 'kit:v1:';
export const FEEDBACK_KEY = 'feedback:pending';
export const KIT_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const FEEDBACK_DELAY_MS = 60 * 60 * 1000;
export const WRITE_DEBOUNCE_MS = 300;
/** Sources above this are stored as a JPEG re-encode (PLAN 3.9). */
export const MAX_STORED_SOURCE_BYTES = 8 * 1024 * 1024;

export type DocStatus = 'todo' | 'in-progress' | 'done';
export type KitScreen = 'upload' | 'crop' | 'result';

/**
 * Crop as the Cropper reports it. `rect` is normalised (0..1) to the flipped+rotated
 * bounding box, so it survives the source being re-encoded at another size.
 */
export interface CropState {
  rect: { x: number; y: number; w: number; h: number };
  rot90: 0 | 1 | 2 | 3;
  fineDeg: number;
  flip: { h: boolean; v: boolean };
  /** Cropper view state for restoring the UI: zoom multiplier and pan in image px. */
  zoom: number;
  panX: number;
  panY: number;
}

export interface CleanupState {
  on: boolean;
  strength: number;
  ink: 'black' | 'blue';
}

export interface DocOutput {
  blob: Blob;
  sizeBytes: number;
  w: number;
  h: number;
  quality: number;
  stages: FitStage[];
  checks: FitCheck[];
  warnings?: FitWarning[];
}

export interface DocState {
  status: DocStatus;
  /** Original file (or a JPEG re-encode when > 8 MB). */
  source?: Blob;
  /** Certificate step (K14): pages to combine. */
  sources?: Blob[];
  crop?: CropState;
  cleanup?: CleanupState;
  nameDate?: NameDate;
  output?: DocOutput;
  /** Output removed because the preset changed; re-fit needed. */
  stale?: boolean;
}

export interface KitState {
  v: 1;
  slug: string;
  presetHash: string;
  cycle: string;
  updatedAt: number;
  current: { docKey: string; screen: KitScreen } | null;
  docs: Record<string, DocState>;
  /** kit_started was sent for this kit. */
  started?: boolean;
}

export interface FeedbackPending {
  slug: string;
  /** Exam display name (not user data). */
  exam: string;
  docs: { key: string; doc: string; label: string }[];
  downloadedAt: number;
}

// ---------------------------------------------------------------------------
// Backend: IndexedDB with in-memory fallback
// ---------------------------------------------------------------------------

interface Backend {
  get<V>(k: string): Promise<V | undefined>;
  set(k: string, v: unknown): Promise<void>;
  del(k: string): Promise<void>;
  keys(): Promise<string[]>;
}

function memoryBackend(): Backend {
  const m = new Map<string, unknown>();
  return {
    get: async <V>(k: string) => m.get(k) as V | undefined,
    set: async (k, v) => void m.set(k, v),
    del: async (k) => void m.delete(k),
    keys: async () => [...m.keys()],
  };
}

function idbBackend(store: UseStore): Backend {
  return {
    get: <V>(k: string) => get<V>(k, store),
    set: (k, v) => set(k, v, store),
    del: (k) => del(k, store),
    keys: async () => (await keys(store)).map(String),
  };
}

let backendP: Promise<Backend> | null = null;
let persistent = true;
const lostListeners = new Set<() => void>();

function markNotPersistent(): void {
  if (!persistent) return;
  persistent = false;
  for (const fn of [...lostListeners]) fn();
}

/**
 * Called once when storage turns out not to persist after load (e.g. Safari private mode
 * accepts the probe but rejects Blob writes). Returns an unsubscribe function.
 */
export function onPersistenceLost(fn: () => void): () => void {
  lostListeners.add(fn);
  return () => void lostListeners.delete(fn);
}

async function probe(): Promise<Backend> {
  try {
    if (typeof indexedDB === 'undefined') throw new Error('no indexedDB');
    const b = idbBackend(createStore('sahisize', 'kv'));
    await b.set('probe', 1);
    if ((await b.get('probe')) !== 1) throw new Error('probe failed');
    await b.del('probe');
    persistent = true;
    return b;
  } catch {
    persistent = false;
    return memoryBackend();
  }
}

function backend(): Promise<Backend> {
  return (backendP ??= probe());
}

/** Falls back to memory if a single write fails (e.g. quota, DataCloneError). */
async function safeSet(k: string, v: unknown): Promise<void> {
  const b = await backend();
  try {
    await b.set(k, v);
  } catch {
    if (persistent) {
      const mem = memoryBackend();
      backendP = Promise.resolve(mem);
      await mem.set(k, v);
      markNotPersistent();
    } else {
      // Already on memory (or a stale IDB handle): keep the value in memory.
      const cur = await backend();
      if (cur !== b) await cur.set(k, v);
    }
  }
}

/** False when progress will not survive a reload (UI shows a banner). */
export function isPersistent(): boolean {
  return persistent;
}

/** Wait for the storage probe; resolves isPersistent(). */
export async function storageReady(): Promise<boolean> {
  await backend();
  return persistent;
}

// ---------------------------------------------------------------------------
// Kit state
// ---------------------------------------------------------------------------

export function kitKey(slug: string): string {
  return `${KIT_PREFIX}${slug}`;
}

export function emptyKit(
  slug: string,
  presetHash: string,
  cycle: string,
  now = Date.now(),
): KitState {
  return { v: 1, slug, presetHash, cycle, updatedAt: now, current: null, docs: {} };
}

export interface LoadResult {
  state: KitState;
  /** True when saved progress existed. */
  restored: boolean;
  /** Doc keys whose outputs were dropped because presetHash changed. */
  stale: string[];
}

/**
 * Load (or create) the kit for `slug`. Purges kits older than 30 days. When the preset
 * changed, keeps sources and crops, drops outputs and marks those docs stale.
 */
export async function loadKit(
  slug: string,
  presetHash: string,
  cycle: string,
  now = Date.now(),
): Promise<LoadResult> {
  await purgeOld(now);
  const b = await backend();
  let saved: KitState | undefined;
  try {
    saved = await b.get<KitState>(kitKey(slug));
  } catch {
    saved = undefined;
  }
  if (!saved || saved.v !== 1 || saved.slug !== slug) {
    return { state: emptyKit(slug, presetHash, cycle, now), restored: false, stale: [] };
  }
  const stale: string[] = [];
  if (saved.presetHash !== presetHash) {
    for (const [k, d] of Object.entries(saved.docs)) {
      if (d.output) {
        delete d.output;
        d.stale = true;
        d.status = d.source || d.sources?.length ? 'in-progress' : 'todo';
        stale.push(k);
      }
    }
    saved.presetHash = presetHash;
    saved.cycle = cycle;
  }
  return { state: saved, restored: true, stale };
}

let pending: KitState | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let inflight: Promise<void> = Promise.resolve();

/** Debounced save (300 ms). Call flushKit() before leaving the page. */
export function saveKit(state: KitState): void {
  pending = { ...state, updatedAt: Date.now() };
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void flushKit(), WRITE_DEBOUNCE_MS);
}

export function flushKit(): Promise<void> {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  const s = pending;
  pending = null;
  if (s) inflight = inflight.then(() => safeSet(kitKey(s.slug), s));
  return inflight;
}

/** "Start over": drop pending writes and delete the kit. */
export async function clearKit(slug: string): Promise<void> {
  if (pending?.slug === slug) {
    pending = null;
    if (timer) clearTimeout(timer);
    timer = null;
  }
  await inflight;
  const b = await backend();
  try {
    await b.del(kitKey(slug));
  } catch {
    /* ignore */
  }
}

/** Delete kits not updated for 30 days. */
export async function purgeOld(now = Date.now()): Promise<number> {
  const b = await backend();
  let n = 0;
  try {
    for (const k of await b.keys()) {
      if (!k.startsWith(KIT_PREFIX)) continue;
      const s = await b.get<KitState>(k);
      if (!s || typeof s.updatedAt !== 'number' || now - s.updatedAt > KIT_TTL_MS) {
        await b.del(k);
        n++;
      }
    }
  } catch {
    /* ignore */
  }
  return n;
}

// ---------------------------------------------------------------------------
// K15 feedback
// ---------------------------------------------------------------------------

export async function setFeedbackPending(p: FeedbackPending): Promise<void> {
  await safeSet(FEEDBACK_KEY, p);
}

/** The pending prompt if it is due (>= 1 hour after download), else null. */
export async function getDueFeedback(now = Date.now()): Promise<FeedbackPending | null> {
  const b = await backend();
  try {
    const p = await b.get<FeedbackPending>(FEEDBACK_KEY);
    if (p && now - p.downloadedAt >= FEEDBACK_DELAY_MS) return p;
  } catch {
    /* ignore */
  }
  return null;
}

export async function clearFeedbackPending(): Promise<void> {
  const b = await backend();
  try {
    await b.del(FEEDBACK_KEY);
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Source blobs
// ---------------------------------------------------------------------------

/**
 * Blob to keep for a doc: the file itself, or a JPEG re-encode (long side 4000,
 * q 0.9) when it is larger than 8 MB. Falls back to the original if re-encoding fails.
 */
export async function storableSource(file: Blob): Promise<Blob> {
  if (file.size <= MAX_STORED_SOURCE_BYTES) return file;
  try {
    if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return file;
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const s = Math.min(1, 4000 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * s);
    canvas.height = Math.round(bmp.height * s);
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close();
    const out = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.9));
    return out && out.size < file.size ? out : file;
  } catch {
    return file;
  }
}

/** Tests only. */
export function __resetKitStoreForTests(): void {
  backendP = null;
  persistent = true;
  lostListeners.clear();
  pending = null;
  if (timer) clearTimeout(timer);
  timer = null;
  inflight = Promise.resolve();
}

export function __useMemoryBackendForTests(): void {
  backendP = Promise.resolve(memoryBackend());
  persistent = false;
}
