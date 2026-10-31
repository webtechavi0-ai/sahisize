/**
 * Zod schemas for small site data files under src/content: SEO maps, exam families, the
 * Hindi exam list, other-documents aliases, the Govt ID section. Pure module.
 */
import { z } from 'zod';
import { DOC_TYPES, EXAM_GROUPS, OUTPUT_FORMATS, PHYSICAL_UNITS } from '@/config/exams';
import { LocalizedTextSchema, SlugSchema, IsoDateSchema } from './preset';

const nonEmpty = z.string().trim().min(1);

/** src/content/seo/exam-seo.json: per-exam English keyword copy. */
export const ExamSeoSchema = z
  .object({
    keyword: nonEmpty,
    title: nonEmpty.optional(),
    h1: nonEmpty.optional(),
    description: nonEmpty.optional(),
    intro: nonEmpty.optional(),
    specH2: nonEmpty.optional(),
    aboutH2: nonEmpty.optional(),
    faqH2: nonEmpty.optional(),
    faq: z.array(z.object({ q: nonEmpty, a: nonEmpty }).strict()).optional(),
  })
  .strict();
export type ExamSeo = z.infer<typeof ExamSeoSchema>;
export const ExamSeoFileSchema = z.record(SlugSchema, ExamSeoSchema);

/** src/content/seo/doc-title-labels.json: English preset label -> title labels. */
export const DocTitleLabelsSchema = z.record(nonEmpty, z.object({ full: nonEmpty, short: nonEmpty }).strict());

/** src/content/seo/exam-title-names.json: slug -> Latin name used in Hindi titles. */
export const ExamTitleNamesSchema = z.record(SlugSchema, nonEmpty);

/** src/content/families.json */
export const FamiliesFileSchema = z
  .object({
    minFamilySize: z.number().int().positive(),
    families: z
      .array(
        z
          .object({
            slug: SlugSchema,
            name: nonEmpty,
            linkText: nonEmpty,
            keyword: nonEmpty,
            /** All given fields must match the preset. */
            match: z
              .object({ group: z.enum(EXAM_GROUPS).optional(), body: nonEmpty.optional() })
              .strict()
              .refine((m) => m.group !== undefined || m.body !== undefined, 'match needs group or body'),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();
export type FamiliesFile = z.infer<typeof FamiliesFileSchema>;

/** src/content/hindi-exams.json: exams that get Hindi pages, in display order. */
export const HindiExamsSchema = z.object({ exams: z.array(SlugSchema) }).strict();

/** src/content/other-docs.json */
export const OtherDocsSchema = z
  .object({ aliases: z.record(nonEmpty, z.array(nonEmpty).min(1)) })
  .strict();

/** src/content/id-documents/section.json */
export const IdSectionSchema = z
  .object({
    checkedOn: IsoDateSchema,
    checkedLabel: LocalizedTextSchema,
    disclaimer: LocalizedTextSchema,
    privacy: LocalizedTextSchema,
    officialDomains: z.array(nonEmpty).min(1),
    sources: z.record(
      SlugSchema,
      z.object({ body: nonEmpty, title: nonEmpty, url: z.string().url(), quote: nonEmpty }).strict(),
    ),
    pages: z
      .array(
        z
          .object({
            slug: SlugSchema,
            doc: z.enum(['photo', 'signature']),
            official: z
              .object({
                dimension: nonEmpty,
                dpi: z.number().int().positive(),
                type: nonEmpty,
                fileType: nonEmpty,
                maxKB: z.number().positive(),
              })
              .strict(),
            /** Engine spec without pixels: widthPx/heightPx are derived from `physical` at `dpi`. */
            spec: z
              .object({
                doc: z.enum(DOC_TYPES),
                label: LocalizedTextSchema,
                minKB: z.number().nonnegative().nullable(),
                maxKB: z.number().positive(),
                format: z.enum(OUTPUT_FORMATS),
                dpi: z.number().int().positive(),
                fileName: z.string().regex(/^[A-Za-z0-9_-]+\.(jpg|jpeg|png)$/),
                rules: z.array(LocalizedTextSchema),
                cleanup: z.enum(['signature', 'thumb']).optional(),
                physical: z
                  .object({ width: z.number().positive(), height: z.number().positive(), unit: z.enum(PHYSICAL_UNITS) })
                  .strict(),
              })
              .strict(),
            sources: z.array(SlugSchema).min(1),
          })
          .strict(),
      )
      .min(1),
    notCovered: z
      .array(
        z.object({ id: SlugSchema, name: LocalizedTextSchema, reason: LocalizedTextSchema, url: z.string().url() }).strict(),
      )
      .min(1),
  })
  .strict();
export type IdSection = z.infer<typeof IdSectionSchema>;
