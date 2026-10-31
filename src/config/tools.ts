/**
 * Tool registry: slugs, paths, KB targets and search metadata. Constants only.
 * Which tool pages have a Hindi version is NOT listed here: it is derived from the copy
 * files present under src/content/tools/hi (see `hindiToolSlugs()` in '@/server/content').
 * Page-slug parsing lives in src/lib/tool-pages.ts.
 */
import type { DocType } from './exams';

/** Sorted ascending: exam pages link the first target >= a document's max KB. */
export const COMPRESS_KB_TARGETS = [
  5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 150, 200, 250, 300, 350, 400, 500,
] as const;
export type CompressKbTarget = (typeof COMPRESS_KB_TARGETS)[number];

/** /tools/compress-pdf-to-{n}kb */
export const PDF_KB_TARGETS = [50, 100, 150, 200, 250, 300, 400, 500] as const;
/** /tools/jpg-to-pdf-under-{n}kb */
export const JPG_PDF_KB_TARGETS = [50, 100, 150, 200, 300, 400, 500] as const;
/** /tools/compress-image-{min}kb-to-{max}kb */
export const COMPRESS_KB_RANGES = [
  [10, 20],
  [20, 50],
  [50, 100],
] as const satisfies readonly (readonly [number, number])[];

export const TOOLS_HUB_PATH = '/tools';
export const MB_TO_KB_PATH = '/tools/mb-to-kb-photo';

export const compressToKbPath = (kb: number): string => `/tools/compress-image-to-${kb}kb`;
export const compressPdfToKbPath = (kb: number): string => `/tools/compress-pdf-to-${kb}kb`;
export const jpgToPdfUnderKbPath = (kb: number): string => `/tools/jpg-to-pdf-under-${kb}kb`;
export const compressRangePath = (min: number, max: number): string =>
  `/tools/compress-image-${min}kb-to-${max}kb`;

/** Base tools (one page each at /tools/{slug}). */
export const TOOL_SLUGS = [
  'compress-image',
  'resize-image',
  'convert-image',
  'signature-resize',
  'thumb-impression',
  'handwritten-declaration',
  'images-to-pdf',
  'compress-pdf',
  'passport-photo-sheet',
  'batch-compress',
  'custom-preset',
  'photo-3-5x4-5-cm',
  'resize-image-in-cm',
  'resize-image-in-mm',
  'passport-size-photo',
  'postcard-size-photo',
  'stamp-size-photo',
  'increase-image-size-in-kb',
  'name-date-on-photo',
] as const;
export type ToolSlug = (typeof TOOL_SLUGS)[number];

/** Resize pages preset to a physical size. */
export const SIZE_PRESET_SLUGS = [
  'photo-3-5x4-5-cm',
  'resize-image-in-cm',
  'resize-image-in-mm',
  'passport-size-photo',
  'postcard-size-photo',
  'stamp-size-photo',
] as const satisfies readonly ToolSlug[];
export type SizePresetSlug = (typeof SIZE_PRESET_SLUGS)[number];

export type SizeUnit = 'px' | 'cm' | 'mm' | 'in';

export interface SizePresetOption {
  id: string;
  w: number;
  h: number;
  unit: Exclude<SizeUnit, 'px'>;
  dpi: number;
  /** Show "w×h unit" in the option label (pages that offer several sizes). */
  withSize: boolean;
}

export interface SizePresetConfig {
  initial: { unit: SizeUnit; w?: number; h?: number; dpi?: number };
  options: readonly SizePresetOption[];
}

/** Starting values and size chips of the size-preset pages. */
export const SIZE_PRESETS: Record<SizePresetSlug, SizePresetConfig> = {
  'photo-3-5x4-5-cm': {
    initial: { unit: 'cm', w: 3.5, h: 4.5, dpi: 200 },
    options: [
      { id: 'd200', w: 3.5, h: 4.5, unit: 'cm', dpi: 200, withSize: false },
      { id: 'd300', w: 3.5, h: 4.5, unit: 'cm', dpi: 300, withSize: false },
    ],
  },
  'passport-size-photo': {
    initial: { unit: 'cm', w: 3.5, h: 4.5, dpi: 200 },
    options: [
      { id: 'f200', w: 3.5, h: 4.5, unit: 'cm', dpi: 200, withSize: true },
      { id: 'f300', w: 3.5, h: 4.5, unit: 'cm', dpi: 300, withSize: true },
      { id: 's200', w: 51, h: 51, unit: 'mm', dpi: 200, withSize: true },
      { id: 's300', w: 51, h: 51, unit: 'mm', dpi: 300, withSize: true },
    ],
  },
  'postcard-size-photo': {
    initial: { unit: 'in', w: 4, h: 6, dpi: 200 },
    options: [
      { id: 'p200', w: 4, h: 6, unit: 'in', dpi: 200, withSize: true },
      { id: 'p300', w: 4, h: 6, unit: 'in', dpi: 300, withSize: true },
    ],
  },
  'stamp-size-photo': {
    initial: { unit: 'cm', w: 2, h: 2.5, dpi: 200 },
    options: [
      { id: 't200', w: 2, h: 2.5, unit: 'cm', dpi: 200, withSize: true },
      { id: 't300', w: 2, h: 2.5, unit: 'cm', dpi: 300, withSize: true },
    ],
  },
  'resize-image-in-cm': { initial: { unit: 'cm' }, options: [] },
  'resize-image-in-mm': { initial: { unit: 'mm' }, options: [] },
};

/** Tool pages that must not be indexed (no sitemap entry, robots noindex). */
export const NOINDEX_TOOL_SLUGS: readonly string[] = ['custom-preset'];

/** Tool categories: the /tools sections and the search "Tools" groups, in display order. */
export const TOOL_CATS = ['kb', 'size', 'signature', 'documents', 'pdf', 'govtId'] as const;
export type ToolCat = (typeof TOOL_CATS)[number];

/** Document words the search maps to tools. */
export type DocWord = Exclude<DocType, 'other'>;

/** Ids shown in tool navigation: every base tool plus the MB-to-KB page. */
export type NavToolId = ToolSlug | 'mb-to-kb';

export interface ToolMeta {
  cat: ToolCat;
  /** English path. */
  path: string;
  /** Lower-case search words (Latin and Devanagari). */
  aliases: readonly string[];
  /** Documents this tool is the answer for. */
  docs?: readonly DocWord[];
  /** i18n key of the display name (namespace `tool`). */
  nameKey: string;
}

/** Per tool: category, path, search words. Order inside a category = display order. */
export const TOOL_META: Record<NavToolId, ToolMeta> = {
  'compress-image': {
    cat: 'kb',
    path: '/tools/compress-image',
    nameKey: 'tool.compressImage.name',
    aliases: ['photo', 'compress photo', 'reduce photo size', 'photo size kam', 'image compress', 'photo chota', 'फोटो छोटा', 'फोटो कम्प्रेस'],
    docs: ['photo'],
  },
  'increase-image-size-in-kb': {
    cat: 'kb',
    path: '/tools/increase-image-size-in-kb',
    nameKey: 'tool.increaseImageSizeInKb.name',
    aliases: ['increase kb', 'increase photo size', 'size badhaye', 'kb badhaye', 'फोटो का साइज़ बढ़ाएं'],
  },
  'mb-to-kb': {
    cat: 'kb',
    path: MB_TO_KB_PATH,
    nameKey: 'ui.search.mbToKb',
    aliases: ['mb to kb', 'mb', 'photo mb to kb'],
  },
  'batch-compress': {
    cat: 'kb',
    path: '/tools/batch-compress',
    nameKey: 'tool.batchCompress.name',
    aliases: ['many photos', 'multiple photos', 'bulk compress'],
  },
  'resize-image': {
    cat: 'size',
    path: '/tools/resize-image',
    nameKey: 'tool.resizeImage.name',
    aliases: ['photo', 'resize photo', 'image resize', 'pixel', 'px', 'width height', 'फोटो रीसाइज़'],
    docs: ['photo'],
  },
  'photo-3-5x4-5-cm': {
    cat: 'size',
    path: '/tools/photo-3-5x4-5-cm',
    nameKey: 'tool.photo35x45Cm.name',
    aliases: ['3.5x4.5', '35x45', '3.5 x 4.5 cm', '4.5x3.5'],
  },
  'resize-image-in-cm': {
    cat: 'size',
    path: '/tools/resize-image-in-cm',
    nameKey: 'tool.resizeImageInCm.name',
    aliases: ['cm', 'centimeter', 'centimetre'],
  },
  'resize-image-in-mm': {
    cat: 'size',
    path: '/tools/resize-image-in-mm',
    nameKey: 'tool.resizeImageInMm.name',
    aliases: ['mm', 'millimeter', 'millimetre'],
  },
  'convert-image': {
    cat: 'size',
    path: '/tools/convert-image',
    nameKey: 'tool.convertImage.name',
    aliases: ['heic', 'heic to jpg', 'png to jpg', 'jpg', 'jpeg', 'png', 'webp', 'format change'],
  },
  'custom-preset': {
    cat: 'size',
    path: '/tools/custom-preset',
    nameKey: 'tool.customPreset.name',
    aliases: ['custom', 'my size', 'exam not listed', 'own size'],
  },
  'signature-resize': {
    cat: 'signature',
    path: '/tools/signature-resize',
    nameKey: 'tool.signatureResize.name',
    aliases: ['signature', 'sign', 'hastakshar', 'signature size', 'signature clean', 'हस्ताक्षर', 'सिग्नेचर'],
    docs: ['signature'],
  },
  'thumb-impression': {
    cat: 'documents',
    path: '/tools/thumb-impression',
    nameKey: 'tool.thumbImpression.name',
    aliases: ['thumb', 'angutha', 'left thumb', 'अंगूठा'],
    docs: ['thumb'],
  },
  'handwritten-declaration': {
    cat: 'documents',
    path: '/tools/handwritten-declaration',
    nameKey: 'tool.handwrittenDeclaration.name',
    aliases: ['declaration', 'ghoshna', 'घोषणा'],
    docs: ['declaration'],
  },
  'name-date-on-photo': {
    cat: 'documents',
    path: '/tools/name-date-on-photo',
    nameKey: 'tool.nameDateOnPhoto.name',
    aliases: ['name date', 'name and date', 'date on photo', 'नाम तारीख'],
  },
  'passport-size-photo': {
    cat: 'documents',
    path: '/tools/passport-size-photo',
    nameKey: 'tool.passportSizePhoto.name',
    aliases: ['passport', 'passport photo'],
  },
  'passport-photo-sheet': {
    cat: 'documents',
    path: '/tools/passport-photo-sheet',
    nameKey: 'tool.passportPhotoSheet.name',
    aliases: ['print', 'photo sheet', 'passport photo print', '4x6'],
  },
  'stamp-size-photo': {
    cat: 'documents',
    path: '/tools/stamp-size-photo',
    nameKey: 'tool.stampSizePhoto.name',
    aliases: ['stamp'],
  },
  'postcard-size-photo': {
    cat: 'documents',
    path: '/tools/postcard-size-photo',
    nameKey: 'tool.postcardSizePhoto.name',
    aliases: ['postcard'],
  },
  'images-to-pdf': {
    cat: 'pdf',
    path: '/tools/images-to-pdf',
    nameKey: 'tool.imagesToPdf.name',
    aliases: ['jpg to pdf', 'image to pdf', 'photo to pdf', 'merge', 'combine certificates', 'certificate pdf', 'pdf banaye'],
    docs: ['certificate'],
  },
  'compress-pdf': {
    cat: 'pdf',
    path: '/tools/compress-pdf',
    nameKey: 'tool.compressPdf.name',
    aliases: ['pdf', 'pdf compress', 'reduce pdf', 'pdf size', 'pdf chota', 'पीडीएफ छोटा'],
  },
};
