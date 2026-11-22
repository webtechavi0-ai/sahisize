/**
 * Zod schema for exam presets (src/content/presets/*.json) and season.json.
 * Strict objects (unknown keys fail), per-document and per-exam integrity rules.
 * Cross-file rules (slug = file name, unique slugs, `related` exists) live in
 * ../core/presets.ts. Pure module: no fs, no server-only.
 */
import { z } from 'zod';
import {
  CONFIDENCE_LEVELS,
  DEFAULT_DERIVE_DPI,
  DOC_TYPES,
  EXAM_GROUPS,
  OUTPUT_FORMATS,
  PHYSICAL_UNITS,
  PRINT_PHOTO_SLUGS,
} from '@/config/exams';
import { derivePx } from '@/lib/presets/helpers';
import type { ExamPreset, PresetDocument, Season } from '@/lib/presets/types';

const nonEmpty = z.string().trim().min(1);

export const LocalizedTextSchema = z.object({ en: nonEmpty, hi: nonEmpty }).strict();

export const SlugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug must be lowercase kebab-case');

/** YYYY-MM-DD, a real calendar date. */
export const IsoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD')
  .refine((s) => {
    const d = new Date(`${s}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(s);
  }, 'invalid calendar date');

export const DocTypeSchema = z.enum(DOC_TYPES);
export const ExamGroupSchema = z.enum(EXAM_GROUPS);
export const ConfidenceSchema = z.enum(CONFIDENCE_LEVELS);

export const PhysicalSizeSchema = z
  .object({ width: z.number().positive(), height: z.number().positive(), unit: z.enum(PHYSICAL_UNITS) })
  .strict();

const px = z.number().int().positive();

const docSpecShape = {
  doc: DocTypeSchema,
  label: LocalizedTextSchema,
  widthPx: px.nullable(),
  heightPx: px.nullable(),
  minWidthPx: px.optional(),
  maxWidthPx: px.optional(),
  minHeightPx: px.optional(),
  maxHeightPx: px.optional(),
  minKB: z.number().nonnegative().nullable(),
  maxKB: z.number().positive().nullable(),
  aspect: z.number().positive().optional(),
  format: z.enum(OUTPUT_FORMATS),
  dpi: z.number().int().min(50).max(1200).nullable(),
  fileName: z
    .string()
    .regex(/^[A-Za-z0-9_-]+\.(jpg|jpeg|png|pdf)$/, 'fileName: letters, digits, _ or -, plus .jpg/.jpeg/.png/.pdf'),
  maxFileNameChars: z.number().int().positive().optional(),
  rules: z.array(LocalizedTextSchema).default([]),
  needsNameDateStrip: z.boolean().optional(),
  cleanup: z.enum(['signature', 'thumb']).nullable().optional(),
  physical: PhysicalSizeSchema.optional(),
  pxDerived: z.boolean().optional(),
};

const presetDocumentExtras = {
  slug: SlugSchema.optional(),
  sizeNote: LocalizedTextSchema.optional(),
  disputed: z.boolean().optional(),
  toVerify: z.boolean().optional(),
  variant: z.enum(['dual-language', 'triple']).nullable().optional(),
  captureTip: LocalizedTextSchema.optional(),
  optional: z.boolean().optional(),
  appliesTo: LocalizedTextSchema.optional(),
};

type DocLike = z.infer<z.ZodObject<typeof docSpecShape>> & { toVerify?: boolean };

/** Integrity rules for one document (shared by preset documents and ID-document specs). */
export function refineDoc(d: DocLike, ctx: z.RefinementCtx): void {
  const issue = (message: string, path: (string | number)[] = []) =>
    ctx.addIssue({ code: z.ZodIssueCode.custom, message, path });

  if ((d.widthPx === null) !== (d.heightPx === null))
    issue('widthPx and heightPx must both be set or both be null', ['widthPx']);
  if (d.maxKB === null) {
    if (!d.toVerify) issue('maxKB may be null only when toVerify is true', ['maxKB']);
  } else if (d.minKB !== null && !(d.minKB < d.maxKB)) {
    issue('minKB must be < maxKB', ['minKB']);
  }
  if (d.minWidthPx !== undefined && d.maxWidthPx !== undefined && d.minWidthPx > d.maxWidthPx)
    issue('minWidthPx must be <= maxWidthPx', ['minWidthPx']);
  if (d.minHeightPx !== undefined && d.maxHeightPx !== undefined && d.minHeightPx > d.maxHeightPx)
    issue('minHeightPx must be <= maxHeightPx', ['minHeightPx']);
  const hasRange =
    d.minWidthPx !== undefined || d.maxWidthPx !== undefined || d.minHeightPx !== undefined || d.maxHeightPx !== undefined;
  if (hasRange && d.widthPx !== null) issue('use either fixed widthPx/heightPx or min/max ranges, not both', ['widthPx']);

  if (d.maxFileNameChars !== undefined && d.fileName.length > d.maxFileNameChars)
    issue(`fileName "${d.fileName}" is longer than maxFileNameChars ${d.maxFileNameChars}`, ['fileName']);
  const ext = d.fileName.split('.').pop()!.toLowerCase();
  const extOk =
    (d.format === 'jpg' && (ext === 'jpg' || ext === 'jpeg')) ||
    (d.format === 'png' && ext === 'png') ||
    (d.format === 'pdf' && ext === 'pdf');
  if (!extOk) issue(`fileName extension .${ext} does not match format ${d.format}`, ['fileName']);
  if (d.format === 'pdf' && d.doc !== 'certificate') issue("format 'pdf' is only allowed for doc 'certificate'", ['format']);
  if (d.format === 'pdf' && d.widthPx !== null) issue('pdf documents must not set widthPx/heightPx', ['widthPx']);

  if (d.pxDerived) {
    if (!d.physical) issue('pxDerived requires physical', ['physical']);
    else if (d.widthPx === null || d.heightPx === null) issue('pxDerived requires widthPx/heightPx', ['widthPx']);
    else {
      const dpi = d.dpi ?? DEFAULT_DERIVE_DPI;
      const w = derivePx(d.physical.width, d.physical.unit, dpi);
      const h = derivePx(d.physical.height, d.physical.unit, dpi);
      if (Math.abs(d.widthPx - w) > 1) issue(`widthPx ${d.widthPx} != ${w} (derived at ${dpi} DPI)`, ['widthPx']);
      if (Math.abs(d.heightPx - h) > 1) issue(`heightPx ${d.heightPx} != ${h} (derived at ${dpi} DPI)`, ['heightPx']);
    }
  }
}

export const DocSpecSchema = z.object(docSpecShape).strict().superRefine(refineDoc);

export const PresetDocumentSchema: z.ZodType<PresetDocument, z.ZodTypeDef, unknown> = z
  .object({ ...docSpecShape, ...presetDocumentExtras })
  .strict()
  .superRefine(refineDoc);

/** An exam-day print photo (lib/presets/types PrintPhoto): physical size only, never uploaded. */
export const PrintPhotoSchema = z
  .object({
    slug: z.enum(PRINT_PHOTO_SLUGS),
    label: LocalizedTextSchema,
    physical: PhysicalSizeSchema,
    use: LocalizedTextSchema,
    count: LocalizedTextSchema.optional(),
    rules: z.array(LocalizedTextSchema).min(1),
    sourcePage: z.number().int().positive().nullable(),
  })
  .strict();

export const RejectionTipSchema = z.object({ error: nonEmpty, fix: LocalizedTextSchema }).strict();
export const FaqItemSchema = z.object({ q: LocalizedTextSchema, a: LocalizedTextSchema }).strict();
export const ExtraSourceSchema = z.object({ label: nonEmpty, url: z.string().url() }).strict();

/** Application window (lib/presets/types ApplyWindow): dates in order, from the notice. */
export const ApplyWindowSchema = z
  .object({
    opens: IsoDateSchema,
    closes: IsoDateSchema,
    lateUntil: IsoDateSchema.optional(),
    correctionUntil: IsoDateSchema.optional(),
    source: nonEmpty,
  })
  .strict()
  .superRefine((w, ctx) => {
    if (w.closes < w.opens) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'closes must be on or after opens', path: ['closes'] });
    if (w.lateUntil && w.lateUntil < w.closes)
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'lateUntil must be on or after closes', path: ['lateUntil'] });
    if (w.correctionUntil && w.correctionUntil < w.closes)
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'correctionUntil must be on or after closes', path: ['correctionUntil'] });
  });

export const ExamPresetSchema: z.ZodType<ExamPreset, z.ZodTypeDef, unknown> = z
  .object({
    slug: SlugSchema,
    name: LocalizedTextSchema,
    aliases: z.array(nonEmpty).default([]),
    body: nonEmpty,
    group: ExamGroupSchema,
    cycle: nonEmpty,
    notification: nonEmpty,
    sourceUrl: z.string().url(),
    sourcePage: z.number().int().positive().nullable(),
    extraSources: z.array(ExtraSourceSchema).optional(),
    lastChecked: IsoDateSchema,
    checkedBy: nonEmpty,
    liveCaptureAlso: z.boolean(),
    photoUploadReplacedByLive: z.boolean(),
    seasonMonths: z.array(z.number().int().min(1).max(12)).default([]),
    documents: z.array(PresetDocumentSchema),
    declarationText: z
      .object({ en: nonEmpty, hi: z.string().optional(), toVerify: z.boolean().optional() })
      .strict()
      .optional(),
    rejectionTips: z.array(RejectionTipSchema).default([]),
    faq: z.array(FaqItemSchema).default([]),
    related: z.array(SlugSchema).default([]),
    published: z.boolean(),
    confidence: ConfidenceSchema,
    liveCaptureTips: z.array(LocalizedTextSchema).optional(),
    applyWindow: ApplyWindowSchema.optional(),
    printPhotos: z.array(PrintPhotoSchema).optional(),
  })
  .strict()
  .superRefine((p, ctx) => {
    const issue = (message: string, path: (string | number)[]) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, message, path });
    const files = new Set<string>();
    const slugs = new Set<string>();
    p.documents.forEach((d, i) => {
      const f = d.fileName.toLowerCase();
      if (files.has(f)) issue(`duplicate fileName "${d.fileName}"`, ['documents', i, 'fileName']);
      files.add(f);
      const s = d.slug ?? d.doc;
      if (slugs.has(s)) issue(`duplicate document slug "${s}"; set a unique \`slug\``, ['documents', i, 'slug']);
      slugs.add(s);
    });
    if (p.related.includes(p.slug)) issue('related must not include the exam itself', ['related']);
    if (new Set(p.related).size !== p.related.length) issue('duplicate related slugs', ['related']);
    if (p.published && p.confidence === 'L') issue("confidence 'L' presets must have published: false", ['published']);
    if (p.published && p.documents.length === 0) issue('published presets need at least one document', ['documents']);
    if (p.photoUploadReplacedByLive && p.documents.some((d) => d.doc === 'photo'))
      issue('photoUploadReplacedByLive presets must not have a photo document', ['documents']);
    if (new Set(p.seasonMonths).size !== p.seasonMonths.length) issue('duplicate seasonMonths', ['seasonMonths']);
    (p.printPhotos ?? []).forEach((x, i) => {
      // Print photo pages share the /exam/{slug}/ path space with document pages.
      if (slugs.has(x.slug)) issue(`print photo slug "${x.slug}" clashes with a document slug`, ['printPhotos', i, 'slug']);
      slugs.add(x.slug);
    });
  });

export const SeasonSchema: z.ZodType<Season, z.ZodTypeDef, unknown> = z
  .object({ order: z.array(SlugSchema), updated: IsoDateSchema })
  .strict();
