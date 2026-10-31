/**
 * File type sniffing and header-only pixel size (no decode). The header size lets the native
 * decoder ask createImageBitmap for the capped size directly (resizeWidth/resizeHeight), so a
 * 12 MP photo is never materialised at full size on the GPU/CPU twice.
 */
import { orientationSwapsAxes, readTiffOrientation } from './exif';

export type SniffedType = 'jpeg' | 'png' | 'webp' | 'heic' | 'gif' | 'bmp' | 'pdf' | 'unknown';

/** Bytes to read from the start of a file for `readImageHeader` (EXIF APP1 can be ~64 KB). */
export const HEADER_PROBE_BYTES = 256 * 1024;

export function sniff(b: Uint8Array, mime = ''): SniffedType {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg';
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'png';
  if (
    b.length >= 12 &&
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  ) {
    return 'webp';
  }
  if (b.length >= 4 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return 'pdf';
  if (b.length >= 6 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return 'gif';
  if (b.length >= 2 && b[0] === 0x42 && b[1] === 0x4d) return 'bmp';
  if (b.length >= 12 && b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) {
    const brand = String.fromCharCode(b[8]!, b[9]!, b[10]!, b[11]!);
    if (/^(heic|heix|hevc|hevx|heim|heis|mif1|msf1|avif)$/.test(brand)) return brand === 'avif' ? 'unknown' : 'heic';
  }
  if (/hei[cf]/i.test(mime)) return 'heic';
  return 'unknown';
}

export interface ImageHeader {
  /** Stored pixel size. */
  width: number;
  height: number;
  /** EXIF orientation (JPEG only; 1 otherwise). */
  orientation: number;
  /** Displayed size after orientation. */
  displayWidth: number;
  displayHeight: number;
}

function header(width: number, height: number, orientation = 1): ImageHeader | null {
  if (!(width > 0 && height > 0)) return null;
  const swap = orientationSwapsAxes(orientation);
  return { width, height, orientation, displayWidth: swap ? height : width, displayHeight: swap ? width : height };
}

/** Tolerant JPEG scan up to the first SOF; works on a truncated prefix of the file. */
function jpegHeader(b: Uint8Array): ImageHeader | null {
  let i = 2;
  let orientation = 1;
  while (i + 4 <= b.length) {
    if (b[i] !== 0xff) return null;
    while (i < b.length && b[i] === 0xff) i++;
    const m = b[i++];
    if (m === undefined) return null;
    if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) continue;
    if (m === 0xd9 || m === 0xda || i + 2 > b.length) return null;
    const len = (b[i]! << 8) | b[i + 1]!;
    if (len < 2) return null;
    const p = i + 2;
    const end = Math.min(b.length, i + len);
    if (m === 0xe1 && end - p >= 14 && b[p] === 0x45 && b[p + 1] === 0x78 && b[p + 2] === 0x69 && b[p + 3] === 0x66 && orientation === 1) {
      orientation = readTiffOrientation(b, p + 6, end);
    }
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
      if (p + 5 > b.length) return null;
      return header((b[p + 3]! << 8) | b[p + 4]!, (b[p + 1]! << 8) | b[p + 2]!, orientation);
    }
    i += len;
  }
  return null;
}

function webpHeader(b: Uint8Array): ImageHeader | null {
  if (b.length < 30) return null;
  const fourcc = String.fromCharCode(b[12]!, b[13]!, b[14]!, b[15]!);
  if (fourcc === 'VP8X') {
    const w = 1 + (b[24]! | (b[25]! << 8) | (b[26]! << 16));
    const h = 1 + (b[27]! | (b[28]! << 8) | (b[29]! << 16));
    return header(w, h);
  }
  if (fourcc === 'VP8 ') {
    return header((b[26]! | (b[27]! << 8)) & 0x3fff, (b[28]! | (b[29]! << 8)) & 0x3fff);
  }
  if (fourcc === 'VP8L' && b[20] === 0x2f) {
    const bits = b[21]! | (b[22]! << 8) | (b[23]! << 16) | (b[24]! << 24);
    return header((bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1);
  }
  return null;
}

/** Pixel size (and JPEG orientation) from the first bytes of a file; null when unknown. */
export function readImageHeader(b: Uint8Array, type: SniffedType = sniff(b)): ImageHeader | null {
  try {
    if (type === 'jpeg') return jpegHeader(b);
    if (type === 'png' && b.length >= 24) {
      const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
      return header(dv.getUint32(16), dv.getUint32(20));
    }
    if (type === 'webp') return webpHeader(b);
    if (type === 'gif' && b.length >= 10) return header(b[6]! | (b[7]! << 8), b[8]! | (b[9]! << 8));
  } catch {
    return null;
  }
  return null;
}
