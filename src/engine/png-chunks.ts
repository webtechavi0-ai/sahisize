/**
 * PNG chunk helpers: pHYs (DPI) and tEXt padding, the PNG equivalents of the JFIF density
 * patch and COM padding. Pixels are never touched.
 */

const SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export function isPng(b: Uint8Array): boolean {
  return b.length > 8 && SIG.every((v, i) => b[i] === v);
}

let CRC_TABLE: Uint32Array | null = null;
function crcTable(): Uint32Array {
  if (CRC_TABLE) return CRC_TABLE;
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return (CRC_TABLE = t);
}

export function crc32(b: Uint8Array, start = 0, end = b.length): number {
  const t = crcTable();
  let c = 0xffffffff;
  for (let i = start; i < end; i++) c = t[(c ^ b[i]!) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  dv.setUint32(8 + data.length, crc32(out, 4, 8 + data.length));
  return out;
}

interface ChunkPos {
  type: string;
  offset: number;
  end: number;
}

function chunks(b: Uint8Array): ChunkPos[] {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const out: ChunkPos[] = [];
  let i = 8;
  while (i + 12 <= b.length) {
    const len = dv.getUint32(i);
    const type = String.fromCharCode(b[i + 4]!, b[i + 5]!, b[i + 6]!, b[i + 7]!);
    const end = i + 12 + len;
    out.push({ type, offset: i, end });
    if (type === 'IEND') break;
    i = end;
  }
  return out;
}

function splice(b: Uint8Array, at: number, removeEnd: number, insert: Uint8Array): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(at + insert.length + (b.length - removeEnd));
  out.set(b.subarray(0, at), 0);
  out.set(insert, at);
  out.set(b.subarray(removeEnd), at + insert.length);
  return out;
}

export function pngDims(b: Uint8Array): { width: number; height: number } {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  return { width: dv.getUint32(16), height: dv.getUint32(20) };
}

/** Write/replace pHYs with `dpi` (stored as pixels per metre). */
export function setPngDpi(b: Uint8Array, dpi: number): Uint8Array<ArrayBuffer> {
  const ppm = Math.round(dpi / 0.0254);
  const data = new Uint8Array(9);
  const dv = new DataView(data.buffer);
  dv.setUint32(0, ppm);
  dv.setUint32(4, ppm);
  data[8] = 1;
  const c = chunk('pHYs', data);
  const list = chunks(b);
  const existing = list.find((x) => x.type === 'pHYs');
  if (existing) return splice(b, existing.offset, existing.end, c);
  const ihdr = list[0]!;
  return splice(b, ihdr.end, ihdr.end, c);
}

export function readPngDpi(b: Uint8Array): number | null {
  const p = chunks(b).find((x) => x.type === 'pHYs');
  if (!p) return null;
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  if (b[p.offset + 16] !== 1) return null;
  return Math.round(dv.getUint32(p.offset + 8) * 0.0254);
}

/** Pad to `targetSize` with a tEXt "Comment" chunk of spaces placed before IEND. */
export function padPng(b: Uint8Array, targetSize: number): Uint8Array<ArrayBuffer> {
  const need = Math.ceil(targetSize) - b.length;
  const overhead = 12 + 8; // chunk framing + "Comment\0"
  if (need <= 0) return splice(b, 0, 0, new Uint8Array(0));
  const n = Math.max(0, need - overhead);
  const data = new Uint8Array(8 + n);
  data.set([0x43, 0x6f, 0x6d, 0x6d, 0x65, 0x6e, 0x74, 0x00]); // "Comment\0"
  data.fill(0x20, 8);
  const iend = chunks(b).find((x) => x.type === 'IEND')!;
  return splice(b, iend.offset, iend.offset, chunk('tEXt', data));
}
