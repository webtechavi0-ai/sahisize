/**
 * ★ Frozen contract (Phase 1). Zod schema for exam presets (SPEC 8.2) plus the
 * A.11 substitute fields (QUESTIONS Q1), Q4 (`physical`, `pxDerived`) and Q7
 * (per-document `slug`). See PLAN 3.2.
 *
 * Uses zod 3.25 (same instance Astro bundles). Do not upgrade to zod 4.
 * Cross-file checks (`related` slugs exist) live in ./index.ts.
 */
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

const nonEmpty = z.string().trim().min(1);

/** Bilingual text. `hi` may be Hinglish where natural (SPEC 3.1). */
export const LocalizedTextSchema = z.object({ en: nonEmpty, hi: nonEmpty }).strict();

/** Bilingual text where Hindi may be filled in later (Workstream G). */
export const LocalizedTextOptionalHiSchema = z
  .object({ en: nonEmpty, hi: z.string().optional() })
  .strict();

export const SlugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug must be lowercase kebab-case');

/** YYYY-MM-DD, a real calendar date. */
export const IsoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD')
  .refine((s) => {
    const d = new Date(`${s}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(s);
  }, 'invalid calendar date');

export const DocTypeSchema = z.enum([
  'photo',
  'signature',
  'thumb',
  'declaration',
  'certificate',
  'other',
]);

export const ExamGroupSchema = z.enum([
  'banking',
  'ssc',
  'railway',
  'nta',
  'upsc',
  'teaching',
  'police',
  'state-psc',
  'defence',
  'other',
]);
export type ExamGroup = z.infer<typeof ExamGroupSchema>;

export const ConfidenceSchema = z.enum(['H', 'M', 'L', 'H/M', 'M/L']);
export type Confidence = z.infer<typeof ConfidenceSchema>;

export const PhysicalSizeSchema = z
  .object({
    width: z.number().positive(),
    height: z.number().positive(),
    unit: z.enum(['cm', 'mm', 'in']),
  })
  .strict();

const px = z.number().int().positive();

// ---------------------------------------------------------------------------
// DocSpec (SPEC 7.8 + Q4), engine input
// ---------------------------------------------------------------------------

const docSpecShape = {
  doc: DocTypeSchema,
  label: LocalizedTextSchema,
  widthPx: px.nullable(),
  heightPx: px.nullable(),
  minWidthPx: px.optional(),
  maxWidthPx: px.optional(),
  minHeightPx: px.optional(),
  maxHeightPx: px.optional(),
  /** 1 KB = 1024 B. null = no minimum. */
  minKB: z.number().nonnegative().nullable(),
  maxKB: z.number().positive(),
  format: z.enum(['jpg', 'png', 'pdf']),
  dpi: z.number().int().min(50).max(1200).nullable(),
  fileName: z
    .string()
    .regex(
      /^[A-Za-z0-9_-]+\.(jpg|jpeg|png|pdf)$/,
      'fileName: letters, digits, _ or -, plus .jpg/.jpeg/.png/.pdf',
    ),
  maxFileNameChars: z.number().int().positive().optional(),
  rules: z.array(LocalizedTextSchema).default([]),
  needsNameDateStrip: z.boolean().optional(),
  cleanup: z.enum(['signature', 'thumb']).nullable().optional(),
  physical: PhysicalSizeSchema.optional(),
  pxDerived: z.boolean().optional(),
};

/** Per-document extras on top of DocSpec (Q1 A.11 substitute, Q7). Not sent to the engine. */
const presetDocumentExtras = {
  /** Q7: route/storage key when an exam has two docs of the same type, e.g. "signature-hindi". */
  slug: SlugSchema.optional(),
  /** e.g. "≈472×157 px, derived from 6.0×2.0 cm at 200 DPI" or "Notice says X, portal accepts Y". */
  sizeNote: LocalizedTextSchema.optional(),
  /** Sources disagree on this document's core size. */
  disputed: z.boolean().optional(),
  /** Value not yet confirmed from the official notice. */
  toVerify: z.boolean().optional(),
  /** A.1 special signature formats. */
  variant: z.enum(['dual-language', 'triple']).nullable().optional(),
  /** Upload-screen tip, e.g. "Sign on white paper with a black pen. Fill the box." / IAF slate. */
  captureTip: LocalizedTextSchema.optional(),
  /** Only some candidates need it (e.g. PwBD certificate, parent signature if under 18). */
  optional: z.boolean().optional(),
  /** Who needs an optional document. */
  appliesTo: LocalizedTextSchema.optional(),
};

type DocLike = {
  widthPx: number | null;
  heightPx: number | null;
  minWidthPx?: number;
  maxWidthPx?: number;
  minHeightPx?: number;
  maxHeightPx?: number;
  minKB: number | null;
  maxKB: number;
  format: 'jpg' | 'png' | 'pdf';
  doc: string;
  dpi: number | null;
  fileName: string;
  maxFileNameChars?: number;
  physical?: { width: number; height: number; unit: 'cm' | 'mm' | 'in' };
  pxDerived?: boolean;
};

const UNIT_PER_INCH = { cm: 2.54, mm: 25.4, in: 1 } as const;

/** Default DPI used when deriving px from a physical size (PLAN 3.3). */
export const DEFAULT_DERIVE_DPI = 200;

/** px = round(length / unitPerInch × dpi) */
export function derivePx(length: number, unit: 'cm' | 'mm' | 'in', dpi: number): number {
  return Math.round((length / UNIT_PER_INCH[unit]) * dpi);
}

function refineDoc(d: DocLike, ctx: z.RefinementCtx): void {
  const issue = (message: string, path: (string | number)[] = []) =>
    ctx.addIssue({ code: z.ZodIssueCode.custom, message, path });

  if ((d.widthPx === null) !== (d.heightPx === null)) {
    issue('widthPx and heightPx must both be set or both be null', ['widthPx']);
  }
  if (d.minKB !== null && !(d.minKB < d.maxKB)) issue('minKB must be < maxKB', ['minKB']);
  if (d.minWidthPx !== undefined && d.maxWidthPx !== undefined && d.minWidthPx > d.maxWidthPx) {
    issue('minWidthPx must be <= maxWidthPx', ['minWidthPx']);
  }
  if (d.minHeightPx !== undefined && d.maxHeightPx !== undefined && d.minHeightPx > d.maxHeightPx) {
    issue('minHeightPx must be <= maxHeightPx', ['minHeightPx']);
  }
  const hasRange =
    d.minWidthPx !== undefined ||
    d.maxWidthPx !== undefined ||
    d.minHeightPx !== undefined ||
    d.maxHeightPx !== undefined;
  if (hasRange && d.widthPx !== null)
    issue('use either fixed widthPx/heightPx or min/max ranges, not both', ['widthPx']);

  if (d.maxFileNameChars !== undefined && d.fileName.length > d.maxFileNameChars) {
    issue(`fileName "${d.fileName}" is longer than maxFileNameChars ${d.maxFileNameChars}`, [
      'fileName',
    ]);
  }
  const ext = d.fileName.split('.').pop()!.toLowerCase();
  const extOk =
    (d.format === 'jpg' && (ext === 'jpg' || ext === 'jpeg')) ||
    (d.format === 'png' && ext === 'png') ||
    (d.format === 'pdf' && ext === 'pdf');
  if (!extOk) issue(`fileName extension .${ext} does not match format ${d.format}`, ['fileName']);
  if (d.format === 'pdf' && d.doc !== 'certificate')
    issue("format 'pdf' is only allowed for doc 'certificate'", ['format']);
  if (d.format === 'pdf' && d.widthPx !== null)
    issue('pdf documents must not set widthPx/heightPx', ['widthPx']);

  if (d.pxDerived) {
    if (!d.physical) {
      issue('pxDerived requires physical', ['physical']);
    } else if (d.widthPx === null || d.heightPx === null) {
      issue('pxDerived requires widthPx/heightPx', ['widthPx']);
    } else {
      const dpi = d.dpi ?? DEFAULT_DERIVE_DPI;
      const w = derivePx(d.physical.width, d.physical.unit, dpi);
      const h = derivePx(d.physical.height, d.physical.unit, dpi);
      if (Math.abs(d.widthPx - w) > 1)
        issue(`widthPx ${d.widthPx} != ${w} (derived at ${dpi} DPI)`, ['widthPx']);
      if (Math.abs(d.heightPx - h) > 1)
        issue(`heightPx ${d.heightPx} != ${h} (derived at ${dpi} DPI)`, ['heightPx']);
    }
  }
}

export const DocSpecSchema = z.object(docSpecShape).strict().superRefine(refineDoc);

export const PresetDocumentSchema = z
  .object({ ...docSpecShape, ...presetDocumentExtras })
  .strict()
  .superRefine(refineDoc);

// ---------------------------------------------------------------------------
// Exam preset (SPEC 8.2 + Q1)
// ---------------------------------------------------------------------------

export const RejectionTipSchema = z
  .object({
    /** Real portal error message, verbatim (usually English). */
    error: nonEmpty,
    fix: LocalizedTextSchema,
  })
  .strict();

export const FaqItemSchema = z.object({ q: LocalizedTextSchema, a: LocalizedTextSchema }).strict();

export const ExtraSourceSchema = z.object({ label: nonEmpty, url: z.string().url() }).strict();

export const ExamPresetSchema = z
  .object({
    slug: SlugSchema,
    name: LocalizedTextSchema,
    aliases: z.array(nonEmpty).default([]),
    /** Conducting body in text only, e.g. "IBPS", "SSC" (never logos, SPEC 3.5). */
    body: nonEmpty,
    group: ExamGroupSchema,
    cycle: nonEmpty,
    notification: nonEmpty,
    sourceUrl: z.string().url(),
    /** Page in the source PDF with the upload specs; null when not known yet. */
    sourcePage: z.number().int().positive().nullable(),
    /** Additional sources (e.g. portal FAQ, second notice copy). */
    extraSources: z.array(ExtraSourceSchema).optional(),
    lastChecked: IsoDateSchema,
    checkedBy: nonEmpty,
    /** A live photo is captured in the form in addition to any upload. */
    liveCaptureAlso: z.boolean(),
    /** Photo is captured live INSTEAD of uploaded (SSC/RRB): no photo document. */
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
    // ---- Q1 (A.11 substitute) ----
    published: z.boolean(),
    confidence: ConfidenceSchema,
    liveCaptureTips: z.array(LocalizedTextSchema).optional(),
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
      if (slugs.has(s)) {
        issue(`duplicate document slug "${s}"; set a unique \`slug\` (Q7)`, [
          'documents',
          i,
          'slug',
        ]);
      }
      slugs.add(s);
    });
    if (p.related.includes(p.slug)) issue('related must not include the exam itself', ['related']);
    if (new Set(p.related).size !== p.related.length) issue('duplicate related slugs', ['related']);
    if (p.published && p.confidence === 'L')
      issue("confidence 'L' presets must have published: false", ['published']);
    if (p.published && p.documents.length === 0)
      issue('published presets need at least one document', ['documents']);
    if (p.photoUploadReplacedByLive && p.documents.some((d) => d.doc === 'photo')) {
      issue('photoUploadReplacedByLive presets must not have a photo document', ['documents']);
    }
    if (new Set(p.seasonMonths).size !== p.seasonMonths.length)
      issue('duplicate seasonMonths', ['seasonMonths']);
  });

// ---------------------------------------------------------------------------
// season.json
// ---------------------------------------------------------------------------

export const SeasonSchema = z
  .object({
    /** Popular-exams grid order (SPEC 6.2). Unknown or hidden slugs are skipped. */
    order: z.array(SlugSchema),
    updated: IsoDateSchema,
  })
  .strict();

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

/** Output type (defaults applied). Assignable to `DocSpec` in src/engine/types.ts. */
export type DocSpecParsed = z.infer<typeof DocSpecSchema>;
export type PresetDocument = z.infer<typeof PresetDocumentSchema>;
export type ExamPreset = z.infer<typeof ExamPresetSchema>;
/** Shape of a preset JSON file before defaults (for authoring tools). */
export type ExamPresetInput = z.input<typeof ExamPresetSchema>;
export type RejectionTip = z.infer<typeof RejectionTipSchema>;
export type FaqItem = z.infer<typeof FaqItemSchema>;
export type Season = z.infer<typeof SeasonSchema>;
export type LocalizedText = z.infer<typeof LocalizedTextSchema>;
