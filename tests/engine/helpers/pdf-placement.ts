import { PDFDocument, PDFArray, PDFName, PDFRawStream, decodePDFRawStream, type PDFObject } from 'pdf-lib';

export interface Placement {
  page: { w: number; h: number };
  /** Image placement from the `a 0 0 d e f cm ... Do` matrix, in points. */
  images: { x: number; y: number; w: number; h: number }[];
}

function streamText(doc: PDFDocument, obj: PDFObject | undefined): string {
  if (!obj) return '';
  const o = doc.context.lookup(obj);
  if (o instanceof PDFArray) return o.asArray().map((x) => streamText(doc, x)).join('\n');
  if (o instanceof PDFRawStream) return new TextDecoder('latin1').decode(decodePDFRawStream(o).decode());
  return '';
}

/** Parse each page's content stream and return where its images are drawn. */
export async function imagePlacements(bytes: Uint8Array): Promise<Placement[]> {
  const doc = await PDFDocument.load(bytes);
  return doc.getPages().map((p) => {
    const text = streamText(doc, p.node.get(PDFName.of('Contents')));
    const images: Placement['images'] = [];
    // Walk the operators, keeping the CTM through q/Q/cm; record it at each `Do`.
    type M = [number, number, number, number, number, number];
    const mul = (m: M, n: M): M => [
      m[0] * n[0] + m[1] * n[2],
      m[0] * n[1] + m[1] * n[3],
      m[2] * n[0] + m[3] * n[2],
      m[2] * n[1] + m[3] * n[3],
      m[4] * n[0] + m[5] * n[2] + n[4],
      m[4] * n[1] + m[5] * n[3] + n[5],
    ];
    let ctm: M = [1, 0, 0, 1, 0, 0];
    const stack: M[] = [];
    const nums: number[] = [];
    for (const tok of text.split(/\s+/).filter(Boolean)) {
      if (/^-?[\d.]+$/.test(tok)) nums.push(Number(tok));
      else {
        if (tok === 'q') stack.push(ctm);
        else if (tok === 'Q') ctm = stack.pop() ?? [1, 0, 0, 1, 0, 0];
        else if (tok === 'cm') ctm = mul(nums.slice(-6) as M, ctm);
        else if (tok === 'Do') images.push({ x: ctm[4], y: ctm[5], w: ctm[0], h: ctm[3] });
        if (!tok.startsWith('/')) nums.length = 0;
      }
    }
    const { width, height } = p.getSize();
    return { page: { w: width, h: height }, images };
  });
}
