// Generates the small committed e2e fixtures (Workstream H). Run once and commit the output:
//   node tests/fixtures/e2e/make-fixtures.mjs
// Synthetic images only (no real people). photo.heic is made with macOS `sips` when available.
import sharp from 'sharp';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { execFileSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = dirname(fileURLToPath(import.meta.url));

/** Deterministic PRNG so re-running produces the same bytes. */
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

function rgbNoise(w, h, seed, fn) {
  const r = rng(seed);
  const buf = Buffer.alloc(w * h * 3);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const [a, b, c] = fn(x, y, r);
      const i = (y * w + x) * 3;
      buf[i] = a;
      buf[i + 1] = b;
      buf[i + 2] = c;
    }
  return sharp(buf, { raw: { width: w, height: h, channels: 3 } });
}

const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));

// Portrait "photo": light background, skin-tone oval head, dark hair, shirt, sensor noise.
async function photo() {
  const w = 900;
  const h = 1100;
  return rgbNoise(w, h, 1, (x, y, r) => {
    const n = (r() - 0.5) * 18;
    const dx = (x - w / 2) / 210;
    const dy = (y - 470) / 270;
    const head = dx * dx + dy * dy < 1;
    const hair = (x - w / 2) ** 2 / 240 ** 2 + (y - 360) ** 2 / 210 ** 2 < 1 && y < 400;
    const body = y > 760 && Math.abs(x - w / 2) < 380 - (y - 760) * -0.3;
    if (hair) return [clamp(40 + n), clamp(30 + n), clamp(25 + n)];
    if (head) {
      const eye = (Math.abs(x - w / 2 - 80) < 25 || Math.abs(x - w / 2 + 80) < 25) && Math.abs(y - 440) < 12;
      if (eye) return [clamp(30 + n), clamp(30 + n), clamp(40 + n)];
      return [clamp(205 + n - dy * 20), clamp(160 + n), clamp(130 + n)];
    }
    if (body) return [clamp(40 + n), clamp(70 + n), clamp(140 + n)];
    return [clamp(236 + n * 0.5), clamp(240 + n * 0.5), clamp(245 + n * 0.5)];
  })
    .jpeg({ quality: 85 })
    .toBuffer();
}

// Signature on slightly grey, shadowed paper: a few cursive strokes.
async function signature() {
  const w = 1200;
  const h = 520;
  const pts = [];
  for (let t = 0; t < 1; t += 0.0004) {
    const x = 120 + t * 960;
    const y = 260 + Math.sin(t * 22) * 90 * (1 - t * 0.4) + Math.cos(t * 7) * 40;
    pts.push([x, y]);
  }
  return rgbNoise(w, h, 2, (x, y, r) => {
    const shade = 225 - (x / w) * 35 - (y / h) * 15 + (r() - 0.5) * 6;
    // cheap stroke test against a coarse subset of points
    for (let i = 0; i < pts.length; i += 6) {
      const [px, py] = pts[i];
      if (Math.abs(px - x) < 7 && Math.abs(py - y) < 7) return [20, 22, 30];
    }
    return [clamp(shade), clamp(shade), clamp(shade - 4)];
  })
    .png({ compressionLevel: 9, palette: true, colours: 32 })
    .toBuffer();
}

// Thumb impression: ellipse of concentric ridges in blue-black ink on white.
async function thumb() {
  const w = 600;
  const h = 640;
  return rgbNoise(w, h, 3, (x, y, r) => {
    const dx = (x - 300) / 190;
    const dy = (y - 320) / 250;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < 1) {
      const ridge = Math.sin(d * 70 + Math.atan2(dy, dx) * 2) > 0.1;
      if (ridge) return [clamp(30 + r() * 30), clamp(35 + r() * 30), clamp(90 + r() * 30)];
    }
    return [clamp(246 + r() * 8), clamp(246 + r() * 8), clamp(246 + r() * 8)];
  })
    .jpeg({ quality: 88 })
    .toBuffer();
}

// Handwritten declaration: rows of scribble "words" on paper. Also used as a certificate page.
async function declaration() {
  const w = 1600;
  const h = 900;
  return rgbNoise(w, h, 4, (x, y, r) => {
    const line = Math.floor((y - 80) / 90);
    const inLine = y > 80 && line < 8 && (y - 80) % 90 < 40;
    const word = Math.floor((x - 80) / 110);
    const inWord = x > 80 && x < 1520 && (x - 80) % 110 < 85 && (word + line) % 7 !== 3;
    if (inLine && inWord && Math.sin(x * 0.35 + line) * Math.cos(y * 0.5) > 0.3)
      return [clamp(25 + r() * 20), clamp(25 + r() * 20), clamp(35 + r() * 20)];
    return [clamp(238 + r() * 14), clamp(238 + r() * 14), clamp(232 + r() * 14)];
  })
    .jpeg({ quality: 85 })
    .toBuffer();
}

// Image-heavy PDF (two A4 pages, each a noisy scan) for compress-pdf; ~400 KB.
async function scanPdf() {
  const doc = await PDFDocument.create();
  for (let p = 0; p < 2; p++) {
    const jpg = await rgbNoise(900, 1273, 10 + p, (x, y, r) => {
      const v = 225 + r() * 22 - ((x + y + p * 37) % 97 < 6 ? 150 : 0);
      return [clamp(v), clamp(v), clamp(v - 5)];
    })
      .jpeg({ quality: 80 })
      .toBuffer();
    const img = await doc.embedJpg(jpg);
    const page = doc.addPage([595.28, 841.89]);
    page.drawImage(img, { x: 0, y: 0, width: 595.28, height: 841.89 });
  }
  return Buffer.from(await doc.save());
}

// Text-only PDF: compress-pdf should report "already small".
async function textPdf() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([595.28, 841.89]);
  page.drawText('SahiSize e2e fixture: a text-only PDF.', { x: 50, y: 780, size: 14, font });
  return Buffer.from(await doc.save());
}

const files = {
  'photo.jpg': await photo(),
  'signature.png': await signature(),
  'thumb.jpg': await thumb(),
  'declaration.jpg': await declaration(),
  'scan.pdf': await scanPdf(),
  'text-only.pdf': await textPdf(),
};
for (const [name, buf] of Object.entries(files)) {
  writeFileSync(join(OUT, name), buf);
  console.log(name, (buf.length / 1024).toFixed(1), 'KB');
}

// HEIC (Q24): macOS `sips` can encode HEIC; libheif-js in the app only decodes.
if (process.platform === 'darwin' && existsSync('/usr/bin/sips')) {
  const small = join(OUT, '.photo-small.jpg');
  writeFileSync(small, await sharp(files['photo.jpg']).resize(600).jpeg().toBuffer());
  execFileSync('/usr/bin/sips', ['-s', 'format', 'heic', small, '--out', join(OUT, 'photo.heic')]);
  execFileSync('/bin/rm', [small]);
  console.log('photo.heic written with sips');
} else {
  console.log('skipped photo.heic (needs macOS sips); keep the committed copy');
}
