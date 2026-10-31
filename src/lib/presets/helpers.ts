/**
 * Pure preset helpers, safe in client components (they take a preset as an argument and
 * never load the registry).
 */
import { DEFAULT_DERIVE_DPI, type PhysicalUnit } from '@/config/exams';
import type { DocSpecData, ExamPreset, PresetDocument } from './types';

const UNIT_PER_INCH: Record<PhysicalUnit, number> = { cm: 2.54, mm: 25.4, in: 1 };

/** px = round(length / unitPerInch × dpi). */
export function derivePx(length: number, unit: PhysicalUnit, dpi: number = DEFAULT_DERIVE_DPI): number {
  return Math.round((length / UNIT_PER_INCH[unit]) * dpi);
}

/** URL/storage key of a document: `doc.slug ?? doc.doc` (unique within an exam). */
export function docSlug(doc: Pick<PresetDocument, 'doc' | 'slug'>): string {
  return doc.slug ?? doc.doc;
}

export function getDocument(preset: ExamPreset, slug: string): PresetDocument | undefined {
  return preset.documents.find((d) => docSlug(d) === slug);
}

/** A document the kit can process. toVerify documents (maxKB null) are listed but skipped. */
export function isFittable(d: Pick<PresetDocument, 'maxKB'>): boolean {
  return d.maxKB !== null;
}

/** Documents the kit walks through, in preset order (these also get /exam/{slug}/{doc} pages). */
export function kitDocuments(preset: ExamPreset): PresetDocument[] {
  return preset.documents.filter(isFittable);
}

/** Strip UI-only fields so only the engine spec crosses the worker boundary. */
export function toDocSpec(d: PresetDocument): DocSpecData {
  const spec: DocSpecData = {
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
  if (d.aspect !== undefined) spec.aspect = d.aspect;
  return spec;
}

function stableStringify(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(',')}]`;
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o)
      .sort()
      .filter((k) => o[k] !== undefined)
      .map((k) => `${JSON.stringify(k)}:${stableStringify(o[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(v);
}

/**
 * Hash of the engine-relevant spec of every document (FNV-1a 32-bit, hex). The kit stores
 * it; a change marks saved outputs stale.
 */
export function presetHash(preset: Pick<ExamPreset, 'documents'>): string {
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
