/**
 * Byte-level JPEG marker utilities (SPEC 7.3 step 4b, 7.5; PLAN 3.6).
 * Never touches entropy-coded scan data: everything happens before SOS.
 */

export interface MarkerSegment {
  /** Marker code without the 0xFF prefix, e.g. 0xE0 for APP0. */
  marker: number;
  /** Offset of the 0xFF that starts the marker. */
  offset: number;
  /** Value of the length field (includes its own 2 bytes). 0 for standalone markers. */
  length: number;
  /** Offset just past this segment. */
  end: number;
}

export const SOI = 0xd8;
export const EOI = 0xd9;
export const SOS = 0xda;
export const APP0 = 0xe0;
export const APP1 = 0xe1;
export const COM = 0xfe;
export const SOF0 = 0xc0;
export const SOF2 = 0xc2;

/** Max payload of one segment: length field is u16 and counts its own 2 bytes. */
export const MAX_SEGMENT_PAYLOAD = 65533;

export function isJpeg(b: Uint8Array): boolean {
  return b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
}

function isStandalone(m: number): boolean {
  return m === 0x01 || (m >= 0xd0 && m <= 0xd7) || m === SOI || m === EOI;
}

/**
 * Walk marker segments from just after SOI up to and including SOS (or EOI).
 * Handles 0xFF fill bytes. Throws on a malformed header.
 */
export function walkMarkers(b: Uint8Array): MarkerSegment[] {
  if (!isJpeg(b)) throw new Error('not a JPEG');
  const out: MarkerSegment[] = [];
  let i = 2;
  while (i < b.length) {
    if (b[i] !== 0xff) throw new Error(`expected marker at ${i}`);
    const offset = i;
    while (i < b.length && b[i] === 0xff) i++; // fill bytes
    if (i >= b.length) break;
    const marker = b[i]!;
    i++;
    if (isStandalone(marker)) {
      out.push({ marker, offset, length: 0, end: i });
      if (marker === EOI) break;
      continue;
    }
    if (i + 2 > b.length) throw new Error('truncated segment length');
    const length = (b[i]! << 8) | b[i + 1]!;
    if (length < 2) throw new Error('bad segment length');
    const end = i + length;
    if (end > b.length) throw new Error('truncated segment');
    out.push({ marker, offset, length, end });
    i = end;
    if (marker === SOS) break;
  }
  return out;
}

function isJfifApp0(b: Uint8Array, seg: MarkerSegment): boolean {
  const p = seg.offset + 4;
  return (
    seg.marker === APP0 &&
    seg.length >= 16 &&
    b[p] === 0x4a && // J
    b[p + 1] === 0x46 && // F
    b[p + 2] === 0x49 && // I
    b[p + 3] === 0x46 && // F
    b[p + 4] === 0x00
  );
}

export interface JpegInfo {
  width: number;
  height: number;
  /** SOF marker code (0xC0 baseline, 0xC1 extended, 0xC2 progressive...). */
  sof: number;
  baseline: boolean;
  progressive: boolean;
  components: number;
  /** Luma sampling factors, e.g. {h: 2, v: 2} for 4:2:0. */
  lumaSampling: { h: number; v: number } | null;
  jfif: { units: number; xDensity: number; yDensity: number } | null;
  hasExif: boolean;
  comSegments: number;
  /** Markers in order, e.g. ['APP0','DQT',...]. */
  markers: string[];
}

function markerName(m: number): string {
  if (m >= 0xe0 && m <= 0xef) return `APP${m - 0xe0}`;
  if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return `SOF${m - 0xc0}`;
  const names: Record<number, string> = {
    0xc4: 'DHT',
    0xdb: 'DQT',
    0xdd: 'DRI',
    0xda: 'SOS',
    0xfe: 'COM',
    0xd9: 'EOI',
  };
  return names[m] ?? `0x${m.toString(16)}`;
}

/** Header facts used by verify.ts and tests. */
export function inspectJpeg(b: Uint8Array): JpegInfo {
  const segs = walkMarkers(b);
  const info: JpegInfo = {
    width: 0,
    height: 0,
    sof: 0,
    baseline: false,
    progressive: false,
    components: 0,
    lumaSampling: null,
    jfif: null,
    hasExif: false,
    comSegments: 0,
    markers: segs.map((s) => markerName(s.marker)),
  };
  for (const s of segs) {
    const p = s.offset + 4; // payload start
    if (s.marker >= 0xc0 && s.marker <= 0xcf && s.marker !== 0xc4 && s.marker !== 0xc8 && s.marker !== 0xcc) {
      info.sof = s.marker;
      info.height = (b[p + 1]! << 8) | b[p + 2]!;
      info.width = (b[p + 3]! << 8) | b[p + 4]!;
      info.components = b[p + 5]!;
      if (info.components > 0) {
        const hv = b[p + 7]!;
        info.lumaSampling = { h: hv >> 4, v: hv & 15 };
      }
      info.baseline = s.marker === SOF0;
      info.progressive = s.marker === SOF2 || s.marker === 0xc6 || s.marker === 0xca || s.marker === 0xce;
    } else if (s.marker === APP0 && isJfifApp0(b, s) && !info.jfif) {
      info.jfif = {
        units: b[p + 7]!,
        xDensity: (b[p + 8]! << 8) | b[p + 9]!,
        yDensity: (b[p + 10]! << 8) | b[p + 11]!,
      };
    } else if (s.marker === APP1) {
      if (b[p] === 0x45 && b[p + 1] === 0x78 && b[p + 2] === 0x69 && b[p + 3] === 0x66) info.hasExif = true;
    } else if (s.marker === COM) {
      info.comSegments++;
    }
  }
  return info;
}

function concat(parts: Uint8Array[]): Uint8Array<ArrayBuffer> {
  let n = 0;
  for (const p of parts) n += p.length;
  const out = new Uint8Array(n);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

/** 18-byte JFIF 1.01 APP0 with the given density. */
export function makeJfifApp0(units: number, x: number, y: number): Uint8Array {
  return new Uint8Array([
    0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, units & 0xff,
    (x >> 8) & 0xff, x & 0xff, (y >> 8) & 0xff, y & 0xff, 0x00, 0x00,
  ]);
}

/**
 * Write DPI into the JFIF APP0 (units = 1 dots/inch). Patches in place (on a copy) when the
 * first segment is a JFIF APP0; otherwise inserts a fresh JFIF APP0 right after SOI.
 * Never assumes APP0 is at a fixed offset.
 */
export function setDpi(b: Uint8Array, dpi: number): Uint8Array<ArrayBuffer> {
  const d = Math.max(1, Math.min(65535, Math.round(dpi)));
  const segs = walkMarkers(b);
  const first = segs[0];
  if (first && isJfifApp0(b, first)) {
    const out = new Uint8Array(b.length);
    out.set(b);
    const p = first.offset + 4;
    out[p + 7] = 1;
    out[p + 8] = (d >> 8) & 0xff;
    out[p + 9] = d & 0xff;
    out[p + 10] = (d >> 8) & 0xff;
    out[p + 11] = d & 0xff;
    return out;
  }
  // A JFIF APP0 must come first; drop any later (misplaced) JFIF APP0 so there is exactly one.
  const parts: Uint8Array[] = [b.subarray(0, 2), makeJfifApp0(1, d, d)];
  let cursor = 2;
  for (const s of segs) {
    if (isJfifApp0(b, s)) {
      parts.push(b.subarray(cursor, s.offset));
      cursor = s.end;
    }
  }
  parts.push(b.subarray(cursor));
  return concat(parts);
}

/**
 * Remove every APPn (n >= 1), non-JFIF APP0 and COM segment before SOS. Keeps the first
 * JFIF APP0. EXIF/XMP/ICC/Photoshop data is dropped (SPEC 7.3 "strip all metadata except JFIF").
 */
export function stripMetadata(b: Uint8Array): Uint8Array<ArrayBuffer> {
  const segs = walkMarkers(b);
  const parts: Uint8Array[] = [b.subarray(0, 2)];
  let keptJfif = false;
  let cursor = 2;
  for (const s of segs) {
    let drop = false;
    if (s.marker === APP0) {
      if (isJfifApp0(b, s) && !keptJfif) keptJfif = true;
      else drop = true;
    } else if ((s.marker >= 0xe1 && s.marker <= 0xef) || s.marker === COM) {
      drop = true;
    }
    if (drop) {
      parts.push(b.subarray(cursor, s.offset));
      cursor = s.end;
    }
  }
  parts.push(b.subarray(cursor));
  return concat(parts);
}

/**
 * Pad with COM segments inserted right after the JFIF APP0 (or after SOI when there is none)
 * so the file is exactly `targetSize` bytes (or up to 3 bytes more when the gap is 1-3 bytes,
 * the minimum segment being 4 bytes). Payload is ASCII spaces. Pixels are untouched.
 */
export function padWithCom(b: Uint8Array, targetSize: number): Uint8Array<ArrayBuffer> {
  let remaining = Math.ceil(targetSize) - b.length;
  if (remaining <= 0) {
    const copy = new Uint8Array(b.length);
    copy.set(b);
    return copy;
  }
  const segs = walkMarkers(b);
  const first = segs[0];
  const insertAt = first && isJfifApp0(b, first) ? first.end : 2;
  const segments: Uint8Array[] = [];
  while (remaining > 0) {
    let total = Math.min(remaining, MAX_SEGMENT_PAYLOAD + 4);
    if (total < 4) total = 4;
    const left = remaining - total;
    if (left > 0 && left < 4) total -= 4 - left; // leave room for a minimal last segment
    const payload = total - 4;
    const seg = new Uint8Array(total);
    seg[0] = 0xff;
    seg[1] = COM;
    seg[2] = ((payload + 2) >> 8) & 0xff;
    seg[3] = (payload + 2) & 0xff;
    seg.fill(0x20, 4);
    segments.push(seg);
    remaining -= total;
  }
  return concat([b.subarray(0, insertAt), ...segments, b.subarray(insertAt)]);
}
