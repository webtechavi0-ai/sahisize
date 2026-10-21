/**
 * Every fittable document spec in src/content/presets (iterates the directory, so presets
 * added later are picked up). Files that do not parse or validate are reported, not fatal:
 * other workstreams may be mid-edit.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PresetDocumentSchema } from '@/content/presets/schema';
import type { DocSpec } from '@/engine/types';

export const PRESET_DIR = fileURLToPath(new URL('../../../src/content/presets', import.meta.url));

export interface PresetSpec {
  key: string;
  spec: DocSpec;
  /** "sbi-clerk/photo", ... every preset document sharing this engine spec. */
  usedBy: string[];
}

export interface LoadedPresets {
  specs: PresetSpec[];
  skipped: string[];
  files: number;
  documents: number;
}

const ENGINE_FIELDS = [
  'doc', 'widthPx', 'heightPx', 'minWidthPx', 'maxWidthPx', 'minHeightPx', 'maxHeightPx', 'minKB', 'maxKB',
  'format', 'aspect', 'dpi', 'needsNameDateStrip', 'cleanup', 'physical', 'pxDerived',
] as const;

export function loadPresetSpecs(dir = PRESET_DIR): LoadedPresets {
  const byKey = new Map<string, PresetSpec>();
  const skipped: string[] = [];
  let files = 0;
  let documents = 0;
  for (const f of readdirSync(dir).sort()) {
    if (!f.endsWith('.json') || f === 'season.json') continue;
    files++;
    let raw: { slug?: string; documents?: unknown[] };
    try {
      raw = JSON.parse(readFileSync(join(dir, f), 'utf8'));
    } catch (e) {
      skipped.push(`${f}: ${(e as Error).message}`);
      continue;
    }
    for (const [i, d] of (raw.documents ?? []).entries()) {
      const res = PresetDocumentSchema.safeParse(d);
      if (!res.success) {
        skipped.push(`${f}#${i}: ${res.error.issues[0]?.message}`);
        continue;
      }
      documents++;
      const doc = res.data;
      const spec = { label: doc.label, rules: doc.rules, fileName: doc.fileName } as unknown as Record<string, unknown>;
      for (const k of ENGINE_FIELDS) if ((doc as Record<string, unknown>)[k] !== undefined) spec[k] = (doc as Record<string, unknown>)[k];
      const key = JSON.stringify(ENGINE_FIELDS.map((k) => (k === 'physical' ? !!spec[k] : spec[k] ?? null)));
      const name = `${raw.slug ?? f}/${doc.slug ?? doc.doc}`;
      const hit = byKey.get(key);
      if (hit) hit.usedBy.push(name);
      else byKey.set(key, { key, spec: spec as unknown as DocSpec, usedBy: [name] });
    }
  }
  return { specs: [...byKey.values()], skipped, files, documents };
}

/** Image specs fit() can process (maxKB known, not PDF). */
export const isImageSpec = (s: DocSpec) => s.maxKB !== null && s.format !== 'pdf';
export const isPdfSpec = (s: DocSpec) => s.maxKB !== null && s.format === 'pdf';

export function specLabel(s: DocSpec): string {
  const px = s.widthPx ? `${s.widthPx}×${s.heightPx}` : s.minWidthPx || s.maxWidthPx || s.minHeightPx || s.maxHeightPx ? `range` : 'kb-only';
  return `${s.doc} ${px} ${s.minKB ?? 0}-${s.maxKB}KB ${s.format}`;
}
