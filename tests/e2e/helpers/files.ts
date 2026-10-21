/**
 * Byte-level checks for downloaded outputs (no app code imported, so the e2e suite checks
 * the files the way a portal would): JPEG frame type, pixel size and JFIF density; PNG
 * size; PDF page boxes and image placement.
 */
import { inflateSync } from 'node:zlib';
import { PDFDocument, PDFName, PDFRawStream, PDFArray, PDFRef, type PDFPage } from 'pdf-lib';

export interface JpegInfo {
  /** SOF marker, e.g. 0xc0 baseline, 0xc2 progressive. */
  sof: number;
  width: number;
  height: number;
  /** JFIF density units: 0 none (aspect), 1 dots per inch, 2 dots per cm. */
  densityUnits: number | null;
  xDensity: number | null;
  yDensity: number | null;
}

export function isJpeg(b: Uint8Array): boolean {
  return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
}

export function isPng(b: Uint8Array): boolean {
  return b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
}

export function isPdf(b: Uint8Array): boolean {
  return b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46;
}

export function jpegInfo(b: Uint8Array): JpegInfo {
  if (!isJpeg(b)) throw new Error('not a JPEG');
  let i = 2;
  const out: JpegInfo = { sof: -1, width: 0, height: 0, densityUnits: null, xDensity: null, yDensity: null };
  while (i + 4 <= b.length) {
    if (b[i] !== 0xff) throw new Error(`bad marker at ${i}`);
    const m = b[i + 1]!;
    if (m === 0xff) {
      i++;
      continue;
    }
    if (m === 0xd8 || (m >= 0xd0 && m <= 0xd7) || m === 0x01) {
      i += 2;
      continue;
    }
    const len = (b[i + 2]! << 8) | b[i + 3]!;
    const seg = i + 4;
    if (m === 0xe0 && String.fromCharCode(...b.slice(seg, seg + 5)) === 'JFIF\0') {
      out.densityUnits = b[seg + 7]!;
      out.xDensity = (b[seg + 8]! << 8) | b[seg + 9]!;
      out.yDensity = (b[seg + 10]! << 8) | b[seg + 11]!;
    }
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
      out.sof = m;
      out.height = (b[seg + 1]! << 8) | b[seg + 2]!;
      out.width = (b[seg + 3]! << 8) | b[seg + 4]!;
    }
    if (m === 0xda) break; // start of scan: headers are done
    i = seg + len - 2;
  }
  return out;
}

export function pngSize(b: Uint8Array): { width: number; height: number } {
  if (!isPng(b)) throw new Error('not a PNG');
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  return { width: dv.getUint32(16), height: dv.getUint32(20) };
}

/** Dual-safe KB window used by the engine (kb.ts): ≥ min×1024 and ≤ max×1000 where possible. */
export function kbWindow(minKB: number | null, maxKB: number): { lo: number; hi: number } {
  const lo = Math.ceil((minKB ?? 0) * 1024);
  const hi1000 = Math.floor(maxKB * 1000);
  return { lo, hi: lo < hi1000 ? hi1000 : Math.floor(maxKB * 1024) };
}

export interface PdfImagePlacement {
  page: number;
  pageW: number;
  pageH: number;
  /** Image rectangle in page points (from the `cm` before `Do`). */
  x: number;
  y: number;
  w: number;
  h: number;
}

function streamBytes(s: PDFRawStream): Uint8Array {
  const filter = s.dict.get(PDFName.of('Filter'));
  const raw = s.getContents();
  if (!filter) return raw;
  const name = filter instanceof PDFArray ? filter.get(0)?.toString() : filter.toString();
  if (name === '/FlateDecode') return inflateSync(raw);
  throw new Error(`unsupported content filter ${name}`);
}

function contentText(page: PDFPage): string {
  const doc = page.doc;
  const c = page.node.get(PDFName.of('Contents'));
  const refs: unknown[] = c instanceof PDFArray ? c.asArray() : [c];
  let text = '';
  for (const r of refs) {
    const obj = r instanceof PDFRef ? doc.context.lookup(r) : r;
    if (obj instanceof PDFRawStream) text += Buffer.from(streamBytes(obj)).toString('latin1') + '\n';
  }
  return text;
}

type M6 = [number, number, number, number, number, number];
const mul = (m: M6, n: M6): M6 => [
  m[0] * n[0] + m[1] * n[2],
  m[0] * n[1] + m[1] * n[3],
  m[2] * n[0] + m[3] * n[2],
  m[2] * n[1] + m[3] * n[3],
  m[4] * n[0] + m[5] * n[2] + n[4],
  m[4] * n[1] + m[5] * n[3] + n[5],
];

/**
 * Every XObject drawn on every page with its bounding box in page points. A tiny content
 * stream interpreter: tracks q/Q and cm (pdf-lib emits translate, rotate, scale and skew as
 * separate cm operators) and maps the unit square through the CTM at each `Do`.
 */
export async function pdfImagePlacements(bytes: Uint8Array): Promise<{ pages: number; images: PdfImagePlacement[] }> {
  const doc = await PDFDocument.load(bytes);
  const images: PdfImagePlacement[] = [];
  doc.getPages().forEach((page, i) => {
    const { width: pageW, height: pageH } = page.getMediaBox();
    const tokens = contentText(page).split(/\s+/).filter(Boolean);
    let ctm: M6 = [1, 0, 0, 1, 0, 0];
    const stack: M6[] = [];
    const operands: string[] = [];
    for (const tok of tokens) {
      if (tok === 'q') stack.push(ctm);
      else if (tok === 'Q') ctm = stack.pop() ?? [1, 0, 0, 1, 0, 0];
      else if (tok === 'cm') ctm = mul(operands.slice(-6).map(Number) as M6, ctm);
      else if (tok === 'Do') {
        const pts = [
          [0, 0],
          [1, 0],
          [0, 1],
          [1, 1],
        ].map(([u, v]) => [u! * ctm[0] + v! * ctm[2] + ctm[4], u! * ctm[1] + v! * ctm[3] + ctm[5]] as const);
        const xs = pts.map((p) => p[0]);
        const ys = pts.map((p) => p[1]);
        const x = Math.min(...xs);
        const y = Math.min(...ys);
        images.push({ page: i + 1, pageW, pageH, x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y });
      }
      if (/^[A-Za-z'"]+\*?$/.test(tok) && !tok.startsWith('/')) operands.length = 0;
      else operands.push(tok);
    }
  });
  return { pages: doc.getPageCount(), images };
}

export const A4_PT = { w: 595.28, h: 841.89 };

export function isA4(w: number, h: number, tol = 2): boolean {
  return (
    (Math.abs(w - A4_PT.w) <= tol && Math.abs(h - A4_PT.h) <= tol) ||
    (Math.abs(w - A4_PT.h) <= tol && Math.abs(h - A4_PT.w) <= tol)
  );
}

export function insidePage(p: PdfImagePlacement, tol = 0.5): boolean {
  return p.w > 0 && p.h > 0 && p.x >= -tol && p.y >= -tol && p.x + p.w <= p.pageW + tol && p.y + p.h <= p.pageH + tol;
}
