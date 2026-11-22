/**
 * Shared helpers for the image pipeline CLIs (generate, optimize, check). Run through tsx so the
 * zod schema in src/components/media/image-schema.ts is shared with the app.
 * See docs/design/image-pipeline.md.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  GeneratedImagesSchema,
  ImageManifestSchema,
  composePrompt,
} from '../../src/components/media/image-schema.ts';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const MANIFEST_PATH = join(ROOT, 'src/content/images/manifest.json');
export const GENERATED_PATH = join(ROOT, 'src/content/images/generated.json');
/** Committed, reviewed PNG sources (input to optimize). Not served. */
export const SOURCE_DIR = join(ROOT, 'assets/images/source');
/** Optimized, content-hashed renditions served at /img/... */
export const PUBLIC_IMG_DIR = join(ROOT, 'public/img');

export const OPENAI_IMAGES_URL = 'https://api.openai.com/v1/images/generations';
export const DEFAULT_IMAGE_MODEL = 'gpt-image-2';

export function formatZodError(err) {
  return err.issues.map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`).join('\n');
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

/** Parsed manifest; throws with a readable message when invalid. */
export function loadManifest(path = MANIFEST_PATH) {
  const parsed = ImageManifestSchema.safeParse(readJson(path));
  if (!parsed.success) throw new Error(`Invalid image manifest ${path}:\n${formatZodError(parsed.error)}`);
  return parsed.data;
}

export function loadGenerated(path = GENERATED_PATH) {
  if (!existsSync(path)) return { version: 1, images: {} };
  const parsed = GeneratedImagesSchema.safeParse(readJson(path));
  if (!parsed.success) throw new Error(`Invalid generated image data ${path}:\n${formatZodError(parsed.error)}`);
  return parsed.data;
}

export function sourcePath(id, dir = SOURCE_DIR) {
  return join(dir, `${id}.png`);
}

/**
 * Minimal flag parser: --only a,b (repeatable), --force, --dry-run, --quality <q>.
 * Unknown flags throw so typos never silently trigger a paid run.
 */
export function parseArgs(argv, known = ['only', 'force', 'dry-run', 'quality']) {
  const out = { only: [], force: false, dryRun: false, quality: undefined };
  for (let i = 0; i < argv.length; i++) {
    const raw = argv[i];
    const [flag, inline] = raw.startsWith('--') ? raw.slice(2).split(/=(.*)/s) : [raw, undefined];
    if (!known.includes(flag)) throw new Error(`Unknown argument: ${raw}`);
    const value = () => {
      const v = inline ?? argv[++i];
      if (v === undefined || v.startsWith('--')) throw new Error(`--${flag} needs a value`);
      return v;
    };
    if (flag === 'only') out.only.push(...value().split(',').map((s) => s.trim()).filter(Boolean));
    else if (flag === 'force') out.force = true;
    else if (flag === 'dry-run') out.dryRun = true;
    else if (flag === 'quality') {
      const q = value();
      if (!['low', 'medium', 'high'].includes(q)) throw new Error('--quality must be low, medium or high');
      out.quality = q;
    }
  }
  return out;
}

/** Selects slots by --only ids (all must exist), else every slot. Retired slots never qualify. */
export function selectSlots(manifest, only) {
  if (only.length) {
    const ids = new Set(manifest.slots.map((s) => s.id));
    const unknown = only.filter((id) => !ids.has(id));
    if (unknown.length) throw new Error(`Unknown slot id(s): ${unknown.join(', ')}`);
  }
  return manifest.slots.filter((s) => s.status !== 'retired' && (!only.length || only.includes(s.id)));
}

/** JSON body for POST /v1/images/generations (gpt-image models always return b64_json). */
export function buildGenerationRequest(manifest, slot, { model = DEFAULT_IMAGE_MODEL, quality } = {}) {
  return {
    model,
    prompt: composePrompt(manifest.style, slot),
    n: 1,
    size: slot.generation.size,
    quality: quality ?? slot.generation.quality,
    background: slot.generation.background,
    output_format: 'png',
  };
}

export function isRetryableStatus(status) {
  return status === 408 || status === 409 || status === 429 || status >= 500;
}

/**
 * Delay before retry `attempt` (0-based): Retry-After when the server sent one, else exponential
 * backoff from `baseMs` with up to 25% jitter, capped at `maxMs`.
 */
export function backoffMs(attempt, retryAfter, { baseMs = 2000, maxMs = 60000, random = Math.random } = {}) {
  if (retryAfter != null && retryAfter !== '') {
    const secs = Number(retryAfter);
    if (Number.isFinite(secs) && secs >= 0) return Math.min(secs * 1000, maxMs);
    const date = Date.parse(retryAfter);
    if (Number.isFinite(date)) return Math.min(Math.max(date - Date.now(), 0), maxMs);
  }
  const exp = Math.min(baseMs * 2 ** attempt, maxMs);
  return Math.round(exp + exp * 0.25 * random());
}

/** Runs `fn` over `items` with at most `limit` in flight; resolves to settled results in order. */
export async function mapPool(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      try {
        results[i] = { status: 'fulfilled', value: await fn(items[i], i) };
      } catch (reason) {
        results[i] = { status: 'rejected', reason };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/** File names optimize writes for a slot: <id>-<width>-<hash8>.<ext>. */
export function renditionName(id, width, hash, ext) {
  return `${id}-${width}-${hash}.${ext}`;
}

/** Matches any rendition file of `id` (and only of `id`, not of ids that share its prefix). */
export function renditionPattern(id) {
  // Slot ids are validated kebab-case ([a-z0-9-]), so they carry no regex metacharacters.
  return new RegExp(`^${id}-\\d+-[0-9a-f]{8}\\.(?:avif|webp)$`);
}

/** Generic rendition file pattern for public/img. */
export const RENDITION_FILE = /^([a-z0-9]+(?:-[a-z0-9]+)*)-(\d+)-([0-9a-f]{8})\.(avif|webp)$/;

/** Stable JSON: sorted object keys, 2-space indent, trailing newline. */
export function stableStringify(value) {
  const sort = (v) => {
    if (Array.isArray(v)) return v.map(sort);
    if (v && typeof v === 'object') {
      return Object.fromEntries(Object.keys(v).sort().map((k) => [k, sort(v[k])]));
    }
    return v;
  };
  return `${JSON.stringify(sort(value), null, 2)}\n`;
}

/** Output height for a width at an aspect string ("3:2"). */
export function heightFor(width, aspect) {
  const [w, h] = aspect.split(':').map(Number);
  return Math.round((width * h) / w);
}

/**
 * Pure check over already-loaded data, exported for tests.
 * `fs` = { exists(absPath): boolean, listPublicImg(): string[] }; `routes` = Set of known paths or null.
 */
export function checkImages({ manifest, generated, fs, routes, sourceDir, publicImgDir }) {
  const errors = [];
  const warnings = [];
  const slots = new Map(manifest.slots.map((s) => [s.id, s]));
  const referenced = new Set();

  for (const slot of manifest.slots) {
    if (!/[ऀ-ॿ]/.test(slot.alt.hi)) errors.push(`${slot.id}: alt.hi has no Devanagari text`);
    const hasSource = fs.exists(sourcePath(slot.id, sourceDir));
    if (slot.status === 'approved') {
      if (!hasSource) errors.push(`${slot.id}: approved but source PNG is missing (${sourcePath(slot.id, sourceDir)})`);
      if (!generated.images[slot.id]) errors.push(`${slot.id}: approved but not optimized; run npm run images:optimize`);
    } else if (slot.status === 'planned' && hasSource) {
      warnings.push(`${slot.id}: source PNG exists but status is "planned"; review it and set "review" or "approved"`);
    } else if (slot.status === 'review' && !hasSource) {
      warnings.push(`${slot.id}: status "review" but no source PNG yet`);
    }
    if (routes) {
      for (const r of slot.routes) if (!routes.has(r)) warnings.push(`${slot.id}: route ${r} is not in docs/routes.txt`);
    }
  }

  for (const [id, entry] of Object.entries(generated.images)) {
    const slot = slots.get(id);
    if (!slot) errors.push(`generated.json: ${id} is not in the manifest`);
    else if (slot.status !== 'approved') errors.push(`generated.json: ${id} is "${slot.status}", not approved; rerun images:optimize`);
    for (const [ext, files] of [['avif', entry.avif], ['webp', entry.webp]]) {
      for (const f of files) {
        const name = f.src.replace(/^\/img\//, '');
        referenced.add(name);
        const m = RENDITION_FILE.exec(name);
        if (!m || m[1] !== id || Number(m[2]) !== f.width || m[3] !== entry.hash || m[4] !== ext) {
          errors.push(`generated.json: ${id} lists ${f.src}, which does not match <id>-${f.width}-${entry.hash}.${ext}`);
        }
        if (!fs.exists(join(publicImgDir, name))) errors.push(`${id}: missing file public/img/${name}`);
      }
    }
    const largest = entry.avif[entry.avif.length - 1];
    if (largest && (largest.width !== entry.width || largest.height !== entry.height)) {
      errors.push(`generated.json: ${id} width/height must equal its largest rendition`);
    }
  }

  for (const name of fs.listPublicImg()) {
    if (RENDITION_FILE.test(name) && !referenced.has(name)) {
      errors.push(`public/img/${name} is not referenced by generated.json; rerun npm run images:optimize`);
    }
  }

  return { errors, warnings };
}

/** Known site paths from docs/routes.txt, or null when the file is absent. */
export function loadRoutes() {
  const path = join(ROOT, 'docs/routes.txt');
  if (!existsSync(path)) return null;
  return new Set(
    readFileSync(path, 'utf8')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.startsWith('/')),
  );
}

