/**
 * Corpus × preset matrix (SPEC 7.3 acceptance, 14.1): every corpus image against every fittable
 * preset spec, with the same preparation the kit does (centre crop to cropAspect(spec), cleanup
 * for signature/thumb specs on ink images), then independent checks on the output bytes.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { cleanupRaster } from '@/engine/cleanup';
import { decodeJpeg, decodePng, encodeJpeg, encodePng } from '@/engine/codecs';
import { decodeBlob } from '@/engine/decode';
import { dimsPass } from '@/engine/dims';
import { fitRaster, type FitDeps } from '@/engine/fit';
import { inspectJpeg, isJpeg } from '@/engine/jpeg-markers';
import { imagesToPdfCore } from '@/engine/pdf';
import { isPng, readPngDpi } from '@/engine/png-chunks';
import { cropRaster } from '@/engine/raster';
import { resizeRaster } from '@/engine/resize';
import { cropAspect, isEngineError, pixelMode, type DocSpec, type FitStage, type RasterImage } from '@/engine/types';
import { targetDpi } from '@/engine/verify';
import { CORPUS_DIR, corpusPlan, makeCorpus, renderItem, type CorpusItem } from '../../../scripts/make-test-corpus';
import { isImageSpec, isPdfSpec, loadPresetSpecs, specLabel } from './presets';

export const FULL = process.env.FULL_CORPUS === '1';
export const RESULTS_DIR = join(CORPUS_DIR, 'results');

export const deps: FitDeps = {
  encodeJpeg,
  encodePng,
  resize: resizeRaster,
  decode: (b, f) => (f === 'jpg' ? decodeJpeg(b) : decodePng(b)),
  now: () => performance.now(),
};

export interface CaseResult {
  item: string;
  kind: string;
  spec: string;
  pixelsOk: boolean;
  formatOk: boolean;
  kbOk: boolean;
  kb1000Ok: boolean;
  dpiOk: boolean;
  checksOk: boolean;
  stages: FitStage[];
  ms: number;
  sizeBytes: number;
  error?: string;
}

/** What the kit does before fit(): default crop box at the spec aspect, cleanup when enabled. */
export async function prepareForSpec(src: RasterImage, spec: DocSpec, item: Pick<CorpusItem, 'kind' | 'params'>): Promise<RasterImage> {
  let r = src;
  const a = cropAspect(spec);
  if (a) {
    const sa = r.width / r.height;
    let w = r.width;
    let h = r.height;
    if (sa > a) w = Math.max(1, Math.round(h * a));
    else h = Math.max(1, Math.round(w / a));
    if (w !== r.width || h !== r.height) r = cropRaster(r, { x: Math.floor((r.width - w) / 2), y: Math.floor((r.height - h) / 2), w, h });
  }
  const inky = item.kind === 'signature' || item.kind === 'thumb' || (item.kind === 'exif' && item.params.sub === 'signature');
  if (spec.cleanup && inky) {
    r = await cleanupRaster(r, spec.cleanup, { strength: 50, ink: item.params.ink === 'blue' && spec.cleanup === 'thumb' ? 'blue' : 'black', targetAspect: a ?? undefined });
  }
  return r;
}

export async function runCase(src: RasterImage, spec: DocSpec, item: Pick<CorpusItem, 'id' | 'kind' | 'params'>): Promise<CaseResult> {
  const base: CaseResult = {
    item: item.id,
    kind: item.kind,
    spec: specLabel(spec),
    pixelsOk: false,
    formatOk: false,
    kbOk: false,
    kb1000Ok: false,
    dpiOk: false,
    checksOk: false,
    stages: [],
    ms: 0,
    sizeBytes: 0,
  };
  try {
    const input = await prepareForSpec(src, spec, item);
    const t = performance.now();
    const r = await fitRaster(input, spec, deps, { seed: 7 });
    base.ms = performance.now() - t;
    base.stages = r.stages;
    base.sizeBytes = r.bytes.length;
    const b = r.bytes;
    const fmt = spec.format === 'png' ? 'png' : 'jpg';
    // independent verification of the bytes
    const decoded = fmt === 'jpg' ? await decodeJpeg(b) : await decodePng(b);
    const fixed = pixelMode(spec) === 'fixed';
    base.pixelsOk =
      decoded.width === r.widthPx && decoded.height === r.heightPx && dimsPass(spec, decoded.width, decoded.height) &&
      (!fixed || (decoded.width === spec.widthPx && decoded.height === spec.heightPx));
    if (fmt === 'jpg') {
      const info = isJpeg(b) ? inspectJpeg(b) : null;
      base.formatOk = !!info && info.baseline && !info.progressive && !info.hasExif && info.markers[0] === 'APP0' && !!info.lumaSampling && info.lumaSampling.h === 2 && info.lumaSampling.v === 2;
      const dpi = targetDpi(spec);
      base.dpiOk = !dpi || (!!info?.jfif && info.jfif.units === 1 && info.jfif.xDensity === dpi && info.jfif.yDensity === dpi);
    } else {
      base.formatOk = isPng(b);
      const dpi = targetDpi(spec);
      base.dpiOk = !dpi || readPngDpi(b) === dpi;
    }
    const min = spec.minKB ?? 0;
    base.kbOk = b.length >= min * 1024 && b.length <= spec.maxKB! * 1024;
    base.kb1000Ok = b.length >= min * 1000 && b.length <= spec.maxKB! * 1000;
    base.checksOk = r.checks.every((c) => c.pass || (c.level ?? 'required') !== 'required');
  } catch (e) {
    base.error = isEngineError(e) ? `${e.code} ${JSON.stringify(e.details ?? {})}` : String(e);
  }
  return base;
}

export interface PdfCaseResult {
  item: string;
  spec: string;
  ok: boolean;
  pages: number;
  sizeBytes: number;
  ms: number;
  error?: string;
}

export async function runPdfCase(src: RasterImage, spec: DocSpec, item: Pick<CorpusItem, 'id'>, pages = 1): Promise<PdfCaseResult> {
  const t = performance.now();
  try {
    const out = await imagesToPdfCore(Array.from({ length: pages }, () => src), { page: 'a4', maxKB: spec.maxKB, minKB: spec.minKB }, encodeJpeg, resizeRaster);
    const n = (await PDFDocument.load(out)).getPageCount();
    const min = (spec.minKB ?? 0) * 1024;
    return { item: item.id, spec: specLabel(spec), ok: n === pages && out.length <= spec.maxKB! * 1024 && out.length >= min, pages: n, sizeBytes: out.length, ms: performance.now() - t };
  } catch (e) {
    return { item: item.id, spec: specLabel(spec), ok: false, pages: 0, sizeBytes: 0, ms: performance.now() - t, error: isEngineError(e) ? e.code : String(e) };
  }
}

/** Corpus items with a loader: from disk when the corpus exists, else rendered in memory. */
export async function corpusItems(full: boolean): Promise<{ item: CorpusItem; load: () => Promise<RasterImage> }[]> {
  if (full) {
    const m = await makeCorpus({ log: true });
    return m.items.map((item) => ({
      item,
      load: async () => decodeBlob(new Blob([new Uint8Array(readFileSync(join(CORPUS_DIR, item.file)))]), { native: false }),
    }));
  }
  // stratified sample: 30 items, every kind represented, small/medium sizes for speed
  const plan = corpusPlan();
  const kinds = [...new Set(plan.map((p) => p.kind))];
  const sample: CorpusItem[] = [];
  const perKind = Math.ceil(30 / kinds.length);
  for (const k of kinds) {
    const ofKind = plan.filter((p) => p.kind === k && p.uprightW * p.uprightH <= 2.5e6);
    const step = Math.max(1, Math.floor(ofKind.length / perKind));
    for (let i = 0; i < ofKind.length && sample.filter((s) => s.kind === k).length < perKind; i += step) sample.push(ofKind[i]!);
  }
  return sample.slice(0, 30).map((item) => ({
    item,
    load: async () => {
      const onDisk = join(CORPUS_DIR, `${item.id}.${item.format}`);
      const bytes = existsSync(onDisk) ? readFileSync(onDisk) : await renderItem(item);
      return decodeBlob(new Blob([new Uint8Array(bytes)]), { native: false });
    },
  }));
}

export interface Summary {
  cases: number;
  pixelsFormat: number;
  kb1024: number;
  kb1000: number;
  dpi: number;
  checks: number;
  errors: number;
  stageFreq: Record<string, number>;
  p50: number;
  p95: number;
  max: number;
  pdfCases: number;
  pdfOk: number;
  failures: string[];
}

export function summarize(res: CaseResult[], pdf: PdfCaseResult[]): Summary {
  const ms = res.map((r) => r.ms).sort((a, b) => a - b);
  const q = (p: number) => (ms.length ? ms[Math.min(ms.length - 1, Math.floor(p * ms.length))]! : 0);
  const stageFreq: Record<string, number> = {};
  for (const r of res) for (const s of r.stages) stageFreq[s] = (stageFreq[s] ?? 0) + 1;
  return {
    cases: res.length,
    pixelsFormat: res.filter((r) => r.pixelsOk && r.formatOk).length,
    kb1024: res.filter((r) => r.kbOk).length,
    kb1000: res.filter((r) => r.kb1000Ok).length,
    dpi: res.filter((r) => r.dpiOk).length,
    checks: res.filter((r) => r.checksOk).length,
    errors: res.filter((r) => r.error).length,
    stageFreq,
    p50: q(0.5),
    p95: q(0.95),
    max: ms[ms.length - 1] ?? 0,
    pdfCases: pdf.length,
    pdfOk: pdf.filter((p) => p.ok).length,
    failures: [
      ...res.filter((r) => !(r.pixelsOk && r.formatOk && r.kbOk) || r.error).map((r) => `${r.item} × ${r.spec}: ${r.error ?? `px=${r.pixelsOk} fmt=${r.formatOk} kb=${r.kbOk} size=${r.sizeBytes}`}`),
      ...pdf.filter((p) => !p.ok).map((p) => `PDF ${p.item} × ${p.spec}: ${p.error ?? `pages=${p.pages} size=${p.sizeBytes}`}`),
    ],
  };
}

/** Run a shard of the matrix (items i where i % shards === shard). */
export async function runMatrix(full: boolean, shard = 0, shards = 1): Promise<{ results: CaseResult[]; pdf: PdfCaseResult[]; specs: number; skipped: string[] }> {
  const loaded = loadPresetSpecs();
  const imageSpecs = loaded.specs.filter((s) => isImageSpec(s.spec)).map((s) => s.spec);
  const pdfSpecs = loaded.specs.filter((s) => isPdfSpec(s.spec)).map((s) => s.spec);
  const items = (await corpusItems(full)).filter((_, i) => i % shards === shard);
  const results: CaseResult[] = [];
  const pdf: PdfCaseResult[] = [];
  for (const [idx, { item, load }] of items.entries()) {
    const src = await load();
    for (const spec of imageSpecs) results.push(await runCase(src, spec, item));
    // PDF specs: every 8th item (PDF assembly is slower), document-like inputs
    if (idx % 8 === 0) for (const spec of pdfSpecs) pdf.push(await runPdfCase(src, spec, item, 1 + (idx % 3)));
  }
  return { results, pdf, specs: imageSpecs.length, skipped: loaded.skipped };
}

export function writeShardResults(name: string, payload: unknown): void {
  mkdirSync(RESULTS_DIR, { recursive: true });
  writeFileSync(join(RESULTS_DIR, `${name}.json`), JSON.stringify(payload));
}

export function readAllShardResults(): { results: CaseResult[]; pdf: PdfCaseResult[] } {
  const out = { results: [] as CaseResult[], pdf: [] as PdfCaseResult[] };
  if (!existsSync(RESULTS_DIR)) return out;
  for (const f of readdirSync(RESULTS_DIR)) {
    if (!f.startsWith('shard-')) continue;
    const j = JSON.parse(readFileSync(join(RESULTS_DIR, f), 'utf8'));
    out.results.push(...j.results);
    out.pdf.push(...j.pdf);
  }
  return out;
}

export function formatSummary(s: Summary, label: string): string {
  const pct = (n: number, d: number) => (d ? ((100 * n) / d).toFixed(2) : '100.00');
  const stages = Object.entries(s.stageFreq)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k} ${pct(v, s.cases)}%`)
    .join(', ');
  return [
    `[corpus] ${label}: ${s.cases} fits`,
    `  pixels+format ${pct(s.pixelsFormat, s.cases)}%  KB(1024) ${pct(s.kb1024, s.cases)}%  KB(1000) ${pct(s.kb1000, s.cases)}%  DPI ${pct(s.dpi, s.cases)}%  checks ${pct(s.checks, s.cases)}%  errors ${s.errors}`,
    `  fit ms p50 ${s.p50.toFixed(0)}  p95 ${s.p95.toFixed(0)}  max ${s.max.toFixed(0)}`,
    `  fit_stage: ${stages}`,
    `  PDF ${s.pdfOk}/${s.pdfCases} under max KB with correct page count`,
    ...s.failures.slice(0, 20).map((f) => `  FAIL ${f}`),
  ].join('\n');
}
