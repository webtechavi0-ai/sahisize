/**
 * Data for the side-rail blocks, derived only from preset fields. Pure (client-safe types,
 * no server imports) so it can be unit-tested.
 */
import type { Lang } from '@/i18n/config';
import { docSlug, kitDocuments, type ExamPreset, type PresetDocument } from '@/lib/presets';
import { kbText } from '@/seo/spec-text';
import { docShape, type DocShape } from './scale-box';

export type SizeTile =
  | { kind: 'doc'; doc: PresetDocument; slug: string; shape: DocShape }
  | { kind: 'pdf-group'; docs: PresetDocument[]; slug: string }
  | { kind: 'live' }
  | { kind: 'more'; n: number };

export const MAX_TILES = 6;

/**
 * "Sizes at a glance" tiles: a live-photo tile first (photo taken in the form), then every kit
 * document in kit order. PDFs with the same KB limits collapse into one tile; more than six tiles
 * end with a "+N more" tile.
 */
export function sizeTiles(p: ExamPreset): SizeTile[] {
  const tiles: SizeTile[] = p.photoUploadReplacedByLive ? [{ kind: 'live' }] : [];
  const groups = new Map<string, { kind: 'pdf-group'; docs: PresetDocument[]; slug: string }>();
  for (const d of kitDocuments(p)) {
    if (d.format === 'pdf') {
      const key = `${d.minKB ?? 0}-${d.maxKB}`;
      const g = groups.get(key);
      if (g) {
        g.docs.push(d);
        continue;
      }
      const ng = { kind: 'pdf-group' as const, docs: [d], slug: docSlug(d) };
      groups.set(key, ng);
      tiles.push(ng);
      continue;
    }
    tiles.push({ kind: 'doc', doc: d, slug: docSlug(d), shape: docShape(d) });
  }
  // A one-document PDF group is just that document.
  const flat: SizeTile[] = tiles.map((t) =>
    t.kind === 'pdf-group' && t.docs.length === 1
      ? { kind: 'doc', doc: t.docs[0]!, slug: t.slug, shape: docShape(t.docs[0]!) }
      : t,
  );
  if (flat.length <= MAX_TILES) return flat;
  const keep = flat.slice(0, MAX_TILES - 1);
  const hidden = flat.slice(MAX_TILES - 1).reduce((n, t) => n + (t.kind === 'pdf-group' ? t.docs.length : 1), 0);
  return [...keep, { kind: 'more', n: hidden }];
}

type Spec = Pick<PresetDocument, 'widthPx' | 'heightPx' | 'minKB' | 'maxKB' | 'format'>;

function sameSpec(a: Spec, b: Spec): boolean {
  return (
    a.widthPx === b.widthPx &&
    a.heightPx === b.heightPx &&
    (a.minKB ?? 0) === (b.minKB ?? 0) &&
    a.maxKB === b.maxKB &&
    a.format === b.format
  );
}

export interface UploadMatch {
  /** Uploads with identical pixels, KB limits and format in both exams. */
  same: number;
  /** Distinct uploads across both exams (a file only one exam asks for counts as different). */
  total: number;
  /** Every upload of both exams matches, so one set of files works for both. */
  all: boolean;
}

/**
 * Compares every uploadable document of two exams, not just photo and signature, so "same files"
 * is never claimed when, say, the certificate limit differs (IBPS PO vs SBI PO).
 */
export function uploadMatch(a: ExamPreset, b: ExamPreset): UploadMatch {
  const byKey = (p: ExamPreset) => new Map(kitDocuments(p).map((d) => [docSlug(d), d] as const));
  const ka = byKey(a);
  const kb = byKey(b);
  const keys = new Set([...ka.keys(), ...kb.keys()]);
  let same = 0;
  for (const k of keys) {
    const x = ka.get(k);
    const y = kb.get(k);
    if (x && y && sameSpec(x, y)) same++;
  }
  return { same, total: keys.size, all: keys.size > 0 && same === keys.size };
}

/** The source link points straight at a PDF file (not an HTML notice page). */
export function isPdfUrl(url: string): boolean {
  try {
    return /\.pdf$/i.test(new URL(url).pathname);
  } catch {
    return false;
  }
}

/** Notification name with the cycle year added when it has none (same rule as NoticeBadge). */
export function noticeWithYear(p: Pick<ExamPreset, 'cycle' | 'notification'>): string {
  const year = p.cycle.match(/\b(19|20)\d{2}\b/)?.[0];
  return year && !/\b(19|20)\d{2}\b/.test(p.notification) ? `${p.notification} ${year}` : p.notification;
}

/** "20–50 KB · JPG" (KB rule and format; no pixels). */
export function kbAndFormat(d: Pick<PresetDocument, 'minKB' | 'maxKB' | 'format'>, lang: Lang): string {
  return [kbText(d, lang), d.format.toUpperCase()].filter(Boolean).join(' · ');
}

/** The exam group shared by every member of a hub, or null when the members span several groups. */
export function singleGroup(members: readonly Pick<ExamPreset, 'group'>[]): string | null {
  const groups = new Set(members.map((p) => p.group));
  return groups.size === 1 ? [...groups][0]! : null;
}
