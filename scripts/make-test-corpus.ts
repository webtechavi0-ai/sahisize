/**
 * Deterministic engine test corpus (SPEC 14.2): >= 300 images written to tests/fixtures/corpus/
 * (gitignored) with a manifest.json.
 *
 *   npm run corpus:make            # all items
 *   npx tsx scripts/make-test-corpus.ts --force
 *
 * Mix: photos 0.3–12 MP as JPG/PNG/WebP (several backgrounds, noise, texture), signatures
 * (thin/thick strokes on white, grey and shadowed paper), thumbs, near-blank images (hardest for
 * min KB), very detailed images (hardest for max KB), EXIF-rotated JPEGs (orientations 2–8) and
 * small/odd-aspect inputs.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { encodeJpeg, encodePng, encodeWebp, setWasmSource } from '../src/engine/codecs';
import { installImageDataPolyfill, nodeWasmSource } from '../src/engine/codecs-node';
import { mulberry32 } from '../src/engine/grain';
import { applyOrientation } from '../src/engine/raster';
import type { RasterImage } from '../src/engine/types';
import {
  insertExifFirst,
  inverseOrientation,
  synthBlank,
  synthDetailed,
  synthPhoto,
  synthSignature,
  synthThumb,
  type Paper,
  type PhotoBg,
} from '../tests/engine/helpers/synth';

export const CORPUS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'tests', 'fixtures', 'corpus');
export const CORPUS_VERSION = 3;

export type CorpusKind = 'photo' | 'signature' | 'thumb' | 'blank' | 'detailed' | 'exif' | 'odd';
export type CorpusFormat = 'jpg' | 'png' | 'webp';

export interface CorpusItem {
  id: string;
  kind: CorpusKind;
  format: CorpusFormat;
  /** Stored pixel size. */
  w: number;
  h: number;
  /** Upright size after EXIF orientation. */
  uprightW: number;
  uprightH: number;
  orientation: number;
  seed: number;
  params: Record<string, string | number | boolean>;
}

export interface Manifest {
  version: number;
  items: (CorpusItem & { file: string; bytes: number })[];
}

/** The deterministic list of corpus items (no pixels yet). */
export function corpusPlan(): CorpusItem[] {
  const rnd = mulberry32(14_2);
  const items: CorpusItem[] = [];
  let n = 0;
  const add = (kind: CorpusKind, format: CorpusFormat, w: number, h: number, params: CorpusItem['params'] = {}, orientation = 1) => {
    const swap = orientation >= 5;
    items.push({
      id: `${kind}-${String(++n).padStart(3, '0')}`,
      kind,
      format,
      w: swap ? h : w,
      h: swap ? w : h,
      uprightW: w,
      uprightH: h,
      orientation,
      seed: 1000 + n,
      params,
    });
  };

  // Photos: 120 across 0.3–12 MP
  const photoSizes: [number, number][] = [
    [480, 640], [600, 800], [750, 1000], [900, 1200], [1200, 1600], [1536, 2048],
    [1600, 1200], [2000, 1500], [2448, 3264], [3000, 4000], [3024, 4032], [4000, 3000],
  ];
  const bgs: PhotoBg[] = ['white', 'light', 'blue', 'gradient', 'busy'];
  for (let i = 0; i < 120; i++) {
    const [w, h] = photoSizes[i % photoSizes.length]!;
    const mp = (w * h) / 1e6;
    const format: CorpusFormat = mp > 3 ? 'jpg' : (['jpg', 'jpg', 'png', 'webp'] as const)[i % 4]!;
    add('photo', format, w, h, { bg: bgs[i % bgs.length]!, noise: [0, 3, 6, 12, 25][Math.floor(rnd() * 5)]!, texture: i % 3 === 0 });
  }
  // Signatures: 70
  const papers: Paper[] = ['white', 'grey', 'shadow'];
  const sigSizes: [number, number][] = [[600, 250], [1000, 400], [1400, 600], [2000, 900], [3000, 1400], [160, 70], [800, 800], [1200, 1600]];
  for (let i = 0; i < 70; i++) {
    const [w, h] = sigSizes[i % sigSizes.length]!;
    add('signature', i % 5 === 4 ? 'png' : 'jpg', w, h, {
      paper: papers[i % 3]!,
      thickness: [1.5, 2.5, 4, 7, 12][i % 5]! * Math.max(0.3, Math.min(w, h) / 600),
      ink: i % 7 === 0 ? 'blue' : 'black',
    });
  }
  // Thumbs: 30
  for (let i = 0; i < 30; i++) {
    const s = [300, 600, 1000, 1500, 2400][i % 5]!;
    add('thumb', i % 4 === 3 && s <= 1000 ? 'png' : 'jpg', s, Math.round(s * (i % 2 ? 1.3 : 1)), { ink: i % 2 ? 'blue' : 'black', paper: papers[i % 3]! });
  }
  // Near-blank: 30
  const colors: [number, number, number][] = [[255, 255, 255], [250, 250, 250], [235, 238, 242], [220, 230, 250], [245, 240, 225]];
  for (let i = 0; i < 30; i++) {
    const s = [120, 200, 400, 800, 1600, 2400][i % 6]!;
    const c = colors[i % colors.length]!;
    add('blank', (['jpg', 'png', 'webp'] as const)[i % 3]!, s, Math.round(s * (i % 2 ? 1.25 : 0.75)), { r: c[0], g: c[1], b: c[2], noise: i % 3 });
  }
  // Very detailed: 30
  for (let i = 0; i < 30; i++) {
    const [w, h] = ([[400, 500], [800, 600], [1200, 1600], [2000, 1500], [3000, 4000], [600, 260]] as [number, number][])[i % 6]!;
    add('detailed', w * h <= 1e6 && i % 2 === 0 ? 'png' : 'jpg', w, h); // PNG noise above 1 MP exceeds the 25 MB cap
  }
  // EXIF-rotated JPEGs: 24 (orientations 2–8)
  for (let i = 0; i < 24; i++) {
    const o = 2 + (i % 7);
    const portrait = i % 2 === 0;
    const sub = i % 3 === 0 ? 'signature' : 'photo';
    const [w, h] = sub === 'signature' ? [1200, 500] : portrait ? [900, 1200] : [1600, 1200];
    add('exif', 'jpg', w, h, { sub, bg: bgs[i % 5]! }, o);
  }
  // Small / odd aspect: 16
  const odd: [number, number][] = [[100, 120], [140, 60], [50, 50], [200, 230], [2000, 300], [300, 2000], [90, 400], [4000, 600]];
  for (let i = 0; i < 16; i++) {
    const [w, h] = odd[i % odd.length]!;
    add('odd', i % 2 ? 'png' : 'jpg', w, h, { sub: i % 3 === 0 ? 'detailed' : i % 3 === 1 ? 'photo' : 'blank' });
  }
  return items;
}

/** Upright pixels for an item. */
export function renderUpright(it: CorpusItem): RasterImage {
  const { uprightW: w, uprightH: h, seed, params: p } = it;
  switch (it.kind) {
    case 'photo':
      return synthPhoto(w, h, seed, { bg: p.bg as PhotoBg, noise: Number(p.noise), texture: !!p.texture });
    case 'signature':
      return synthSignature(w, h, seed, { paper: p.paper as Paper, thickness: Number(p.thickness), ink: p.ink as 'black' | 'blue' }).raster;
    case 'thumb':
      return synthThumb(w, h, seed, p.ink as 'black' | 'blue', p.paper as Paper).raster;
    case 'blank':
      return synthBlank(w, h, seed, [Number(p.r), Number(p.g), Number(p.b)], Number(p.noise));
    case 'detailed':
      return synthDetailed(w, h, seed);
    case 'exif':
      return p.sub === 'signature'
        ? synthSignature(w, h, seed, { paper: 'shadow', thickness: 5 }).raster
        : synthPhoto(w, h, seed, { bg: p.bg as PhotoBg, noise: 5 });
    case 'odd':
      return p.sub === 'detailed' ? synthDetailed(w, h, seed) : p.sub === 'photo' ? synthPhoto(w, h, seed, { noise: 4 }) : synthBlank(w, h, seed, [252, 252, 252], 1);
  }
}

/** Encoded file bytes for an item (EXIF items are stored rotated with an orientation tag). */
export async function renderItem(it: CorpusItem): Promise<Uint8Array> {
  const upright = renderUpright(it);
  const stored = it.orientation > 1 ? applyOrientation(upright, inverseOrientation(it.orientation)) : upright;
  if (it.format === 'png') return encodePng(stored);
  if (it.format === 'webp') return encodeWebp(stored, 88);
  const q = it.kind === 'detailed' ? 95 : 90;
  const jpg = await encodeJpeg(stored, q);
  return it.orientation > 1 ? insertExifFirst(jpg, it.orientation, it.seed % 2 === 0) : jpg;
}

export function readManifest(dir = CORPUS_DIR): Manifest | null {
  const p = join(dir, 'manifest.json');
  if (!existsSync(p)) return null;
  try {
    const m = JSON.parse(readFileSync(p, 'utf8')) as Manifest;
    return m.version === CORPUS_VERSION ? m : null;
  } catch {
    return null;
  }
}

export async function makeCorpus(opts: { dir?: string; force?: boolean; log?: boolean } = {}): Promise<Manifest> {
  const dir = opts.dir ?? CORPUS_DIR;
  const existing = readManifest(dir);
  if (existing && !opts.force && existing.items.every((i) => existsSync(join(dir, i.file)))) return existing;
  installImageDataPolyfill();
  setWasmSource(nodeWasmSource);
  mkdirSync(dir, { recursive: true });
  const plan = corpusPlan();
  const items: Manifest['items'] = [];
  let total = 0;
  for (const it of plan) {
    const bytes = await renderItem(it);
    const file = `${it.id}.${it.format}`;
    writeFileSync(join(dir, file), bytes);
    items.push({ ...it, file, bytes: bytes.length });
    total += bytes.length;
    if (opts.log && items.length % 25 === 0) console.log(`  ${items.length}/${plan.length}`);
  }
  const manifest: Manifest = { version: CORPUS_VERSION, items };
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest, null, 1));
  // drop files from older corpus versions
  const keep = new Set(['manifest.json', 'results', ...items.map((i) => i.file)]);
  for (const f of readdirSync(dir)) if (!keep.has(f)) rmSync(join(dir, f), { recursive: true, force: true });
  if (opts.log) console.log(`corpus: ${items.length} images, ${(total / 1048576).toFixed(1)} MB in ${dir}`);
  return manifest;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const t = Date.now();
  await makeCorpus({ force: process.argv.includes('--force'), log: true });
  console.log(`done in ${((Date.now() - t) / 1000).toFixed(1)} s`);
}
