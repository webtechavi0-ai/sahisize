/**
 * Area painted by raster images in a pdfjs operator list (used by compressPdf's text-only check).
 * Pure: the pdfjs OPS table is passed in, so tests can use a fake one.
 */

/** The subset of pdfjs' `OPS` enum this needs. */
export interface PdfOps {
  save: number;
  restore: number;
  transform: number;
  paintFormXObjectBegin: number;
  paintFormXObjectEnd: number;
  paintImageXObject: number;
  paintInlineImageXObject: number;
  paintImageMaskXObject: number;
  paintImageXObjectRepeat: number;
  paintImageMaskXObjectRepeat: number;
  paintInlineImageXObjectGroup: number;
  paintImageMaskXObjectGroup: number;
}

type Mat = [number, number, number, number, number, number];

const mul = (m: Mat, t: Mat): Mat => [
  m[0] * t[0] + m[2] * t[1],
  m[1] * t[0] + m[3] * t[1],
  m[0] * t[2] + m[2] * t[3],
  m[1] * t[2] + m[3] * t[3],
  m[0] * t[4] + m[2] * t[5] + m[4],
  m[1] * t[4] + m[3] * t[5] + m[5],
];

const isMat = (v: unknown): v is Mat => Array.isArray(v) && v.length === 6 && v.every((x) => typeof x === 'number');

/** Image area (PDF points²) painted by an operator list; images are drawn in the unit square. */
export function imageAreaFromOps(ops: PdfOps, fnArray: readonly number[], argsArray: readonly unknown[]): number {
  const single = new Set([ops.paintImageXObject, ops.paintInlineImageXObject, ops.paintImageMaskXObject]);
  const repeat = new Set([ops.paintImageXObjectRepeat, ops.paintImageMaskXObjectRepeat]);
  const group = new Set([ops.paintInlineImageXObjectGroup, ops.paintImageMaskXObjectGroup]);
  let ctm: Mat = [1, 0, 0, 1, 0, 0];
  const stack: Mat[] = [];
  let area = 0;
  const det = () => Math.abs(ctm[0] * ctm[3] - ctm[1] * ctm[2]);
  for (let i = 0; i < fnArray.length; i++) {
    const fn = fnArray[i]!;
    const raw = argsArray[i];
    const args = Array.isArray(raw) ? (raw as unknown[]) : null;
    if (fn === ops.save) stack.push(ctm);
    else if (fn === ops.restore) ctm = stack.pop() ?? ctm;
    else if (fn === ops.transform && args && isMat(args)) ctm = mul(ctm, args);
    else if (fn === ops.paintFormXObjectBegin) {
      stack.push(ctm);
      const m = args?.[0];
      if (isMat(m)) ctm = mul(ctm, m);
    } else if (fn === ops.paintFormXObjectEnd) ctm = stack.pop() ?? ctm;
    else if (single.has(fn)) area += det();
    else if (repeat.has(fn) && args) {
      const sx = Number(args[1]) || 1;
      const sy = Number(args[2]) || 1;
      const pos = args[3] as ArrayLike<number> | undefined;
      const copies = pos ? Math.max(1, Math.floor(pos.length / 2)) : 1;
      area += copies * Math.abs(sx * sy) * det();
    } else if (group.has(fn)) area += det();
  }
  return area;
}
