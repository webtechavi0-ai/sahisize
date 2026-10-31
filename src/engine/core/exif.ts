/**
 * Minimal EXIF orientation reader (APP1 "Exif\0\0", IFD0 tag 0x0112). Used by the WASM decode
 * path; createImageBitmap(..., { imageOrientation: 'from-image' }) handles it natively.
 */
import { APP1, isJpeg, walkMarkers, type MarkerSegment } from './jpeg-markers';

/** Orientations 5-8 swap width and height. */
export function orientationSwapsAxes(orientation: number): boolean {
  return orientation >= 5 && orientation <= 8;
}

/** Orientation from a TIFF block starting at `t` and ending (exclusive) at `end`; 1 when unreadable. */
export function readTiffOrientation(b: Uint8Array, t: number, end: number): number {
  const le = b[t] === 0x49 && b[t + 1] === 0x49;
  const be = b[t] === 0x4d && b[t + 1] === 0x4d;
  if (!le && !be) return 1;
  const u16 = (o: number) => (le ? b[o]! | (b[o + 1]! << 8) : (b[o]! << 8) | b[o + 1]!);
  const u32 = (o: number) =>
    le
      ? (b[o]! | (b[o + 1]! << 8) | (b[o + 2]! << 16) | (b[o + 3]! << 24)) >>> 0
      : ((b[o]! << 24) | (b[o + 1]! << 16) | (b[o + 2]! << 8) | b[o + 3]!) >>> 0;
  if (t + 8 > end || u16(t + 2) !== 42) return 1;
  const ifd = t + u32(t + 4);
  if (ifd + 2 > end) return 1;
  const count = u16(ifd);
  for (let i = 0; i < count; i++) {
    const e = ifd + 2 + i * 12;
    if (e + 12 > end) break;
    if (u16(e) === 0x0112) {
      const v = u16(e + 8);
      return v >= 1 && v <= 8 ? v : 1;
    }
  }
  return 1;
}

function isExifHeader(b: Uint8Array, p: number): boolean {
  return b[p] === 0x45 && b[p + 1] === 0x78 && b[p + 2] === 0x69 && b[p + 3] === 0x66 && b[p + 4] === 0 && b[p + 5] === 0;
}

/** Returns 1-8, or 1 when absent / unreadable. Only the first EXIF APP1 is considered. */
export function readOrientation(b: Uint8Array): number {
  if (!isJpeg(b)) return 1;
  let segs: MarkerSegment[];
  try {
    segs = walkMarkers(b);
  } catch {
    return 1;
  }
  for (const s of segs) {
    if (s.marker !== APP1) continue;
    const p = s.offset + 4;
    if (s.end - p < 14 || !isExifHeader(b, p)) continue;
    return readTiffOrientation(b, p + 6, s.end);
  }
  return 1;
}
