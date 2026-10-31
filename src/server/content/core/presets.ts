/**
 * Preset loading and cross-file validation (framework-free; used by the server-only
 * registry, scripts/presets-check.ts and tests).
 */
import { join } from 'node:path';
import type { ExamPreset, Season } from '@/lib/presets/types';
import { ExamPresetSchema, SeasonSchema } from '../schemas/preset';
import { ContentValidationError, contentPath, displayPath, listJsonFiles, readJson, zodProblems } from './read';

export const SEASON_FILE = 'season.json';

/**
 * Validate raw preset JSON keyed by file name: schema, slug === file name, unique slugs,
 * `related` slugs exist. Throws one ContentValidationError listing every problem.
 */
export function validatePresets(raw: Record<string, unknown>): ExamPreset[] {
  const errors: string[] = [];
  const out: ExamPreset[] = [];
  for (const [file, data] of Object.entries(raw).sort(([a], [b]) => a.localeCompare(b))) {
    const res = ExamPresetSchema.safeParse(data);
    if (!res.success) {
      errors.push(...zodProblems(res.error, `${file}: `));
      continue;
    }
    const base = file.split(/[\\/]/).pop()!.replace(/\.json$/, '');
    if (base !== res.data.slug) errors.push(`${file}: slug "${res.data.slug}" must match file name "${base}"`);
    out.push(res.data);
  }
  const slugs = new Set<string>();
  for (const p of out) {
    if (slugs.has(p.slug)) errors.push(`duplicate slug "${p.slug}"`);
    slugs.add(p.slug);
  }
  for (const p of out)
    for (const r of p.related) if (!slugs.has(r)) errors.push(`${p.slug}.json: related slug "${r}" does not exist`);
  if (errors.length) throw new ContentValidationError('exam presets', errors);
  return out.sort((a, b) => a.slug.localeCompare(b.slug));
}

/** Validate season.json. Unknown or unpublished slugs in `order` are allowed (skipped by readers). */
export function validateSeason(raw: unknown): Season {
  const res = SeasonSchema.safeParse(raw);
  if (!res.success) throw new ContentValidationError(`presets/${SEASON_FILE}`, zodProblems(res.error));
  if (new Set(res.data.order).size !== res.data.order.length)
    throw new ContentValidationError(`presets/${SEASON_FILE}`, ['order: duplicate slugs']);
  return res.data;
}

/** Read every preset JSON (except season.json) from `dir` (default src/content/presets). */
export function loadPresetsFromDir(dir: string = contentPath('presets')): ExamPreset[] {
  const raw: Record<string, unknown> = {};
  for (const f of listJsonFiles(dir)) {
    if (f === SEASON_FILE) continue;
    raw[f] = readJson(join(dir, f));
  }
  if (!Object.keys(raw).length) throw new ContentValidationError(displayPath(dir), ['no preset files found']);
  return validatePresets(raw);
}

export function loadSeasonFromDir(dir: string = contentPath('presets')): Season {
  return validateSeason(readJson(join(dir, SEASON_FILE)));
}
