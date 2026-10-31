/**
 * Minimal EXIF orientation reader (APP1 "Exif\0\0", IFD0 tag 0x0112). Used by the jsquash
 * decode fallback; createImageBitmap(..., {imageOrientation:'from-image'}) handles it natively.
 */
import { APP1, isJpeg, walkMarkers } from './jpeg-markers';

/** Returns 1-8, or 1 when absent / unreadable. */
export function readOrientation(b: Uint8Array): number {
  if (!isJpeg(b)) return 1;
  let segs;
  try {
    segs = walkMarkers(b);
  } catch {
    return 1;
  }
  for (const s of segs) {
    if (s.marker !== APP1) continue;
    const p = s.offset + 4;
    const end = s.end;
    if (end - p < 14) continue;
    if (!(b[p] === 0x45 && b[p + 1] === 0x78 && b[p + 2] === 0x69 && b[p + 3] === 0x66 && b[p + 4] === 0 && b[p + 5] === 0)) continue;
    const t = p + 6; // TIFF header
    const le = b[t] === 0x49 && b[t + 1] === 0x49;
    const be = b[t] === 0x4d && b[t + 1] === 0x4d;
    if (!le && !be) return 1;
    const u16 = (o: number) => (le ? b[o]! | (b[o + 1]! << 8) : (b[o]! << 8) | b[o + 1]!);
    const u32 = (o: number) =>
      le
        ? (b[o]! | (b[o + 1]! << 8) | (b[o + 2]! << 16) | (b[o + 3]! << 24)) >>> 0
        : ((b[o]! << 24) | (b[o + 1]! << 16) | (b[o + 2]! << 8) | b[o + 3]!) >>> 0;
    if (u16(t + 2) !== 42) return 1;
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
  return 1;
}
