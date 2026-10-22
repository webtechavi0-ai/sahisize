/**
 * Tool registry (SPEC 4, 5.2). Workstream F. `hasHindi` mirrors the files in src/pages/hi/tools.
 * `nameKey` is an i18n key in the `tool` namespace (src/i18n/ns/tool.*.json).
 */

export const COMPRESS_KB_TARGETS = [10, 20, 30, 50, 100, 200, 500] as const;
export type CompressKbTarget = (typeof COMPRESS_KB_TARGETS)[number];

export type ToolSlug =
  | 'compress-image'
  | 'resize-image'
  | 'convert-image'
  | 'signature-resize'
  | 'thumb-impression'
  | 'handwritten-declaration'
  | 'images-to-pdf'
  | 'compress-pdf'
  | 'passport-photo-sheet'
  | 'batch-compress'
  | 'custom-preset';

export interface ToolDef {
  slug: ToolSlug;
  /** i18n key, e.g. `tool.compressImage.name`. */
  nameKey: string;
  /** Route path without trailing slash, English. */
  path: string;
  /** KB targets that get their own `/tools/compress-image-to-[n]kb` pages. */
  kbPresets: readonly number[];
  /** SPEC 5.2 priority. */
  priority: 'P0' | 'P1' | 'P2';
  /** Has a Hindi page under /hi/tools (top 6). */
  hasHindi: boolean;
}

export const TOOLS: readonly ToolDef[] = [
  {
    slug: 'compress-image',
    nameKey: 'tool.compressImage.name',
    path: '/tools/compress-image',
    kbPresets: COMPRESS_KB_TARGETS,
    priority: 'P0',
    hasHindi: true,
  },
  {
    slug: 'resize-image',
    nameKey: 'tool.resizeImage.name',
    path: '/tools/resize-image',
    kbPresets: [],
    priority: 'P0',
    hasHindi: true,
  },
  {
    slug: 'convert-image',
    nameKey: 'tool.convertImage.name',
    path: '/tools/convert-image',
    kbPresets: [],
    priority: 'P0',
    hasHindi: false,
  },
  {
    slug: 'signature-resize',
    nameKey: 'tool.signatureResize.name',
    path: '/tools/signature-resize',
    kbPresets: [],
    priority: 'P0',
    hasHindi: true,
  },
  {
    slug: 'thumb-impression',
    nameKey: 'tool.thumbImpression.name',
    path: '/tools/thumb-impression',
    kbPresets: [],
    priority: 'P0',
    hasHindi: false,
  },
  {
    slug: 'handwritten-declaration',
    nameKey: 'tool.handwrittenDeclaration.name',
    path: '/tools/handwritten-declaration',
    kbPresets: [],
    priority: 'P1',
    hasHindi: false,
  },
  {
    slug: 'images-to-pdf',
    nameKey: 'tool.imagesToPdf.name',
    path: '/tools/images-to-pdf',
    kbPresets: [],
    priority: 'P1',
    hasHindi: true,
  },
  {
    slug: 'compress-pdf',
    nameKey: 'tool.compressPdf.name',
    path: '/tools/compress-pdf',
    kbPresets: [],
    priority: 'P1',
    hasHindi: false,
  },
  {
    slug: 'passport-photo-sheet',
    nameKey: 'tool.passportPhotoSheet.name',
    path: '/tools/passport-photo-sheet',
    kbPresets: [],
    priority: 'P2',
    hasHindi: false,
  },
  {
    slug: 'batch-compress',
    nameKey: 'tool.batchCompress.name',
    path: '/tools/batch-compress',
    kbPresets: [],
    priority: 'P1',
    hasHindi: false,
  },
  {
    slug: 'custom-preset',
    nameKey: 'tool.customPreset.name',
    path: '/tools/custom-preset',
    kbPresets: [],
    priority: 'P0',
    hasHindi: false,
  },
];

export function compressToKbPath(kb: number): string {
  return `/tools/compress-image-to-${kb}kb`;
}

export function getTool(slug: ToolSlug): ToolDef {
  const t = TOOLS.find((x) => x.slug === slug);
  if (!t) throw new Error(`Unknown tool: ${slug}`);
  return t;
}

/** T7 pages `/tools/compress-pdf-to-[n]kb` (keyword map, Tools: PDF). */
export const PDF_KB_TARGETS = [50, 100, 150, 200, 250, 300, 400, 500] as const;
export type PdfKbTarget = (typeof PDF_KB_TARGETS)[number];

/** T6 pages `/tools/jpg-to-pdf-under-[n]kb` (keyword map, Tools: PDF). */
export const JPG_PDF_KB_TARGETS = [50, 100, 150, 200, 300, 400, 500] as const;
export type JpgPdfKbTarget = (typeof JPG_PDF_KB_TARGETS)[number];

export function compressPdfToKbPath(kb: number): string {
  return `/tools/compress-pdf-to-${kb}kb`;
}

export function jpgToPdfUnderKbPath(kb: number): string {
  return `/tools/jpg-to-pdf-under-${kb}kb`;
}
