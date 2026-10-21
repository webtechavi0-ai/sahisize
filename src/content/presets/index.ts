/**
 * ★ Frozen contract (Phase 1). Preset loader and helpers (PLAN 3.1).
 *
 * - In Astro and Vitest, every `./*.json` (except season.json) is loaded with
 *   `import.meta.glob` and validated at module load: an invalid file throws, so
 *   `astro build` and `vitest` fail (SPEC 8.1).
 * - In plain Node scripts (tsx), `import.meta.glob` does not exist: call
 *   `loadPresetsFromFs()` instead (also validates).
 * - Islands must NOT import this module. Pages pass a single preset (or the slim
 *   search index) as props.
 */
import type { DocSpec } from '@/engine/types';
import seasonRaw from './season.json';
import {
  ExamPresetSchema,
  SeasonSchema,
  type ExamGroup,
  type ExamPreset,
  type PresetDocument,
  type Season,
} from './schema';

export type { ExamPreset, PresetDocument, Season, ExamGroup } from './schema';

// ---------------------------------------------------------------------------
// Validation (shared by glob and fs paths)
// ---------------------------------------------------------------------------

export class PresetValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PresetValidationError';
  }
}

/**
 * Validate raw JSON objects keyed by file path. Checks each file against the
 * schema, slug === file name, unique slugs, and that `related` slugs exist.
 * Throws PresetValidationError listing every problem.
 */
export function validatePresets(raw: Record<string, unknown>): ExamPreset[] {
  const errors: string[] = [];
  const out: ExamPreset[] = [];
  for (const [file, data] of Object.entries(raw).sort(([a], [b]) => a.localeCompare(b))) {
    const res = ExamPresetSchema.safeParse(data);
    if (!res.success) {
      for (const i of res.error.issues)
        errors.push(`${file}: ${i.path.join('.') || '(root)'}: ${i.message}`);
      continue;
    }
    const base = file
      .split(/[\\/]/)
      .pop()!
      .replace(/\.json$/, '');
    if (base !== res.data.slug)
      errors.push(`${file}: slug "${res.data.slug}" must match file name "${base}"`);
    out.push(res.data);
  }
  const slugs = new Set<string>();
  for (const p of out) {
    if (slugs.has(p.slug)) errors.push(`duplicate slug "${p.slug}"`);
    slugs.add(p.slug);
  }
  for (const p of out) {
    for (const r of p.related)
      if (!slugs.has(r)) errors.push(`${p.slug}.json: related slug "${r}" does not exist`);
  }
  if (errors.length) {
    throw new PresetValidationError(
      `Invalid exam presets (${errors.length}):\n  - ${errors.join('\n  - ')}`,
    );
  }
  return out;
}

export function validateSeason(raw: unknown): Season {
  const res = SeasonSchema.safeParse(raw);
  if (!res.success) {
    throw new PresetValidationError(
      `Invalid season.json:\n  - ${res.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n  - ')}`,
    );
  }
  return res.data;
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

function globRaw(): Record<string, unknown> | null {
  try {
    return import.meta.glob<unknown>(['./*.json', '!./season.json'], {
      eager: true,
      import: 'default',
    });
  } catch {
    return null; // not running under Vite (e.g. tsx scripts)
  }
}

let registry: ExamPreset[] = (() => {
  const raw = globRaw();
  return raw ? validatePresets(raw) : [];
})();

const season: Season = validateSeason(seasonRaw);

/**
 * Load and validate presets from disk (Node scripts). Also installs them as the
 * registry so the getters below work in that process.
 */
export async function loadPresetsFromFs(dir?: string): Promise<ExamPreset[]> {
  const { readdirSync, readFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const root = dir ?? fileURLToPath(new URL('.', import.meta.url));
  const raw: Record<string, unknown> = {};
  for (const f of readdirSync(root)) {
    if (!f.endsWith('.json') || f === 'season.json') continue;
    raw[f] = JSON.parse(readFileSync(join(root, f), 'utf8'));
  }
  registry = validatePresets(raw);
  return registry;
}

/** Preview builds: SHOW_UNPUBLISHED=1 includes hidden presets everywhere. */
function showUnpublished(): boolean {
  return typeof process !== 'undefined' && process.env?.SHOW_UNPUBLISHED === '1';
}

/** Every preset, published or not, sorted by slug. */
export function getAllPresets(): ExamPreset[] {
  return registry;
}

/** Presets that get pages, search entries and sitemap entries. */
export function getPublishedPresets(): ExamPreset[] {
  return showUnpublished() ? registry : registry.filter((p) => p.published);
}

/** Lookup by slug among ALL presets (check `.published` yourself). */
export function getPreset(slug: string): ExamPreset | undefined {
  return registry.find((p) => p.slug === slug);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * URL/storage key of a document: `doc.slug ?? doc.doc` (Q7). The schema
 * guarantees uniqueness within an exam. `siblings` is accepted for API
 * compatibility with PLAN 3.1 and ignored.
 */
export function docSlug(
  doc: Pick<PresetDocument, 'doc' | 'slug'>,
  _siblings?: readonly unknown[],
): string {
  return doc.slug ?? doc.doc;
}

/** Find a document of a preset by its docSlug. */
export function getDocument(preset: ExamPreset, slug: string): PresetDocument | undefined {
  return preset.documents.find((d) => docSlug(d) === slug);
}

/** Strip UI-only fields so only the engine DocSpec crosses the worker boundary. */
export function toDocSpec(d: PresetDocument): DocSpec {
  const spec: DocSpec = {
    doc: d.doc,
    label: d.label,
    widthPx: d.widthPx,
    heightPx: d.heightPx,
    minKB: d.minKB,
    maxKB: d.maxKB,
    format: d.format,
    dpi: d.dpi,
    fileName: d.fileName,
    rules: d.rules,
  };
  if (d.minWidthPx !== undefined) spec.minWidthPx = d.minWidthPx;
  if (d.maxWidthPx !== undefined) spec.maxWidthPx = d.maxWidthPx;
  if (d.minHeightPx !== undefined) spec.minHeightPx = d.minHeightPx;
  if (d.maxHeightPx !== undefined) spec.maxHeightPx = d.maxHeightPx;
  if (d.maxFileNameChars !== undefined) spec.maxFileNameChars = d.maxFileNameChars;
  if (d.needsNameDateStrip !== undefined) spec.needsNameDateStrip = d.needsNameDateStrip;
  if (d.cleanup !== undefined) spec.cleanup = d.cleanup;
  if (d.physical !== undefined) spec.physical = d.physical;
  if (d.pxDerived !== undefined) spec.pxDerived = d.pxDerived;
  return spec;
}

export interface SourceEntry {
  slug: string;
  name: ExamPreset['name'];
  body: string;
  cycle: string;
  notification: string;
  sourceUrl: string;
  sourcePage: number | null;
  extraSources: { label: string; url: string }[];
  lastChecked: string;
  confidence: ExamPreset['confidence'];
}

/** Rows for /sources (SPEC 5.3), published presets only, by body then name. */
export function getSources(): SourceEntry[] {
  return getPublishedPresets()
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      body: p.body,
      cycle: p.cycle,
      notification: p.notification,
      sourceUrl: p.sourceUrl,
      sourcePage: p.sourcePage,
      extraSources: p.extraSources ?? [],
      lastChecked: p.lastChecked,
      confidence: p.confidence,
    }))
    .sort((a, b) => a.body.localeCompare(b.body) || a.name.en.localeCompare(b.name.en));
}

/**
 * Published presets in popular-grid order (SPEC 6.2): season.json order first,
 * then remaining published presets by name.
 */
export function getSeasonOrder(): ExamPreset[] {
  const published = getPublishedPresets();
  const bySlug = new Map(published.map((p) => [p.slug, p]));
  const ordered: ExamPreset[] = [];
  for (const s of season.order) {
    const p = bySlug.get(s);
    if (p) {
      ordered.push(p);
      bySlug.delete(s);
    }
  }
  return [...ordered, ...[...bySlug.values()].sort((a, b) => a.name.en.localeCompare(b.name.en))];
}

export function getSeason(): Season {
  return season;
}

/** Slim search entry (PLAN 3.10). Hidden exams are included with published:false for "coming soon" hints. */
export interface SearchEntry {
  slug: string;
  en: string;
  hi: string;
  aliases: string[];
  body: string;
  group: ExamGroup;
  published: boolean;
}

export function getSearchIndex(): SearchEntry[] {
  const pub = new Set(getPublishedPresets().map((p) => p.slug));
  return registry.map((p) => ({
    slug: p.slug,
    en: p.name.en,
    hi: p.name.hi,
    aliases: p.aliases,
    body: p.body,
    group: p.group,
    published: pub.has(p.slug),
  }));
}

function stableStringify(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(',')}]`;
  if (v && typeof v === 'object') {
    return `{${Object.keys(v)
      .sort()
      .filter((k) => (v as Record<string, unknown>)[k] !== undefined)
      .map((k) => `${JSON.stringify(k)}:${stableStringify((v as Record<string, unknown>)[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(v);
}

/**
 * Hash of the engine-relevant spec of every document (FNV-1a 32-bit, hex).
 * Kit state stores it; a change marks saved outputs stale (PLAN 3.9).
 */
export function presetHash(preset: ExamPreset): string {
  const s = stableStringify(
    preset.documents.map(toDocSpec).map(({ label: _l, rules: _r, ...rest }) => rest),
  );
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}
