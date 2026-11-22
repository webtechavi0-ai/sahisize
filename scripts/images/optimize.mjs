/**
 * Turn approved source PNGs into responsive, content-hashed AVIF + WebP files.
 *
 *   npm run images:optimize                    # every slot with "status": "approved"
 *   npm run images:optimize -- --only home-hero
 *   npm run images:optimize -- --force         # re-encode even when the hash is unchanged
 *
 * For each approved slot: centre-crop assets/images/source/<id>.png to the slot aspect, resize to
 * each of its widths, write public/img/<id>-<width>-<hash8>.{avif,webp}, and record width, height,
 * blurDataURL and file list in src/content/images/generated.json (sorted keys, no timestamps).
 * hash8 = sha256(source bytes + encode settings + sharp version), so unchanged inputs give the same
 * names and changed ones bust caches. Stale renditions and entries of slots that are no longer
 * approved are removed (only on a full run, not with --only).
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import {
  GENERATED_PATH,
  PUBLIC_IMG_DIR,
  RENDITION_FILE,
  heightFor,
  loadGenerated,
  loadManifest,
  parseArgs,
  renditionName,
  renditionPattern,
  selectSlots,
  sourcePath,
  stableStringify,
} from './lib.mjs';

/** Bump to force new hashes when the encode pipeline below changes in a way settings don't show. */
const PIPELINE_VERSION = 1;
const ENCODE = {
  avif: { quality: 50, effort: 6, chromaSubsampling: '4:2:0' },
  webp: { quality: 76, effort: 6, smartSubsample: true },
  blur: { width: 16, quality: 40 },
};

// Single-threaded libvips for byte-for-byte reproducible output across runs.
sharp.concurrency(1);
sharp.cache(false);

function fail(message) {
  console.error(`images:optimize: ${message}`);
  process.exit(1);
}

function hashFor(source, slot) {
  const settings = JSON.stringify({
    PIPELINE_VERSION,
    ENCODE,
    aspect: slot.aspect,
    widths: slot.widths,
    sharp: sharp.versions?.sharp ?? null,
  });
  return createHash('sha256').update(source).update(settings).digest('hex').slice(0, 8);
}

/** Centre crop region of `meta` at `aspect`. */
function cropRegion(meta, aspect) {
  const [aw, ah] = aspect.split(':').map(Number);
  const target = aw / ah;
  const current = meta.width / meta.height;
  if (Math.abs(current - target) < 1e-3) return { left: 0, top: 0, width: meta.width, height: meta.height };
  if (current > target) {
    const width = Math.round(meta.height * target);
    return { left: Math.floor((meta.width - width) / 2), top: 0, width, height: meta.height };
  }
  const height = Math.round(meta.width / target);
  return { left: 0, top: Math.floor((meta.height - height) / 2), width: meta.width, height };
}

function filesIntact(entry) {
  return [...entry.avif, ...entry.webp].every((f) => existsSync(join(PUBLIC_IMG_DIR, f.src.replace(/^\/img\//, ''))));
}

async function optimizeSlot(slot, previous, force) {
  const src = sourcePath(slot.id);
  if (!existsSync(src)) {
    throw new Error(`${slot.id} is approved but ${src} is missing. Run images:generate or add the PNG.`);
  }
  const source = readFileSync(src);
  const hash = hashFor(source, slot);
  if (!force && previous?.hash === hash && filesIntact(previous)) {
    console.log(`  ${slot.id}: unchanged (${hash})`);
    return previous;
  }

  const meta = await sharp(source).metadata();
  if (!meta.width || !meta.height) throw new Error(`${slot.id}: cannot read image size`);
  const region = cropRegion(meta, slot.aspect);
  const base = () => sharp(source).extract(region);

  const widths = slot.widths.filter((w) => w <= region.width);
  const skipped = slot.widths.filter((w) => w > region.width);
  if (skipped.length) console.warn(`  ${slot.id}: skipping widths ${skipped.join(', ')} (source crop is ${region.width}px wide)`);
  if (!widths.length) throw new Error(`${slot.id}: source is smaller than every target width`);

  const avif = [];
  const webp = [];
  for (const width of widths) {
    const height = heightFor(width, slot.aspect);
    const resized = () => base().resize({ width, height, fit: 'fill', kernel: 'lanczos3' });
    const avifName = renditionName(slot.id, width, hash, 'avif');
    const webpName = renditionName(slot.id, width, hash, 'webp');
    writeFileSync(join(PUBLIC_IMG_DIR, avifName), await resized().avif(ENCODE.avif).toBuffer());
    writeFileSync(join(PUBLIC_IMG_DIR, webpName), await resized().webp(ENCODE.webp).toBuffer());
    avif.push({ src: `/img/${avifName}`, width, height });
    webp.push({ src: `/img/${webpName}`, width, height });
  }

  const blurBuf = await base()
    .resize({ width: ENCODE.blur.width, height: heightFor(ENCODE.blur.width, slot.aspect), fit: 'fill' })
    .webp({ quality: ENCODE.blur.quality })
    .toBuffer();

  const largest = avif[avif.length - 1];
  console.log(`  ${slot.id}: ${widths.join('/')} px -> ${hash}`);
  return {
    width: largest.width,
    height: largest.height,
    hash,
    blurDataURL: `data:image/webp;base64,${blurBuf.toString('base64')}`,
    avif,
    webp,
  };
}

/** Delete renditions of `id` that are not in `keep` (a set of file names). */
function removeStale(id, keep) {
  if (!existsSync(PUBLIC_IMG_DIR)) return;
  const pattern = renditionPattern(id);
  for (const name of readdirSync(PUBLIC_IMG_DIR)) {
    if (pattern.test(name) && !keep.has(name)) {
      rmSync(join(PUBLIC_IMG_DIR, name));
      console.log(`  removed stale ${name}`);
    }
  }
}

async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2), ['only', 'force']);
  } catch (err) {
    fail(err.message);
  }
  const manifest = loadManifest();
  const generated = loadGenerated();
  const approved = selectSlots(manifest, args.only).filter((s) => s.status === 'approved');
  const fullRun = args.only.length === 0;

  mkdirSync(PUBLIC_IMG_DIR, { recursive: true });
  const images = fullRun ? {} : { ...generated.images };

  if (!approved.length) console.log('images:optimize: no approved slots selected.');
  for (const slot of approved) {
    images[slot.id] = await optimizeSlot(slot, generated.images[slot.id], args.force);
    const keep = new Set([...images[slot.id].avif, ...images[slot.id].webp].map((f) => f.src.replace(/^\/img\//, '')));
    removeStale(slot.id, keep);
  }

  if (fullRun) {
    // Drop files of slots that are no longer approved (or no longer exist).
    for (const name of existsSync(PUBLIC_IMG_DIR) ? readdirSync(PUBLIC_IMG_DIR) : []) {
      const m = RENDITION_FILE.exec(name);
      if (!m) continue;
      const owner = Object.keys(images).find((id) => renditionPattern(id).test(name));
      if (!owner) {
        rmSync(join(PUBLIC_IMG_DIR, name));
        console.log(`  removed unpublished ${name}`);
      }
    }
  }

  writeFileSync(GENERATED_PATH, stableStringify({ version: 1, images }));
  console.log(`images:optimize: ${Object.keys(images).length} published slot(s) in src/content/images/generated.json`);
}

main().catch((err) => fail(err.stack ?? String(err)));
