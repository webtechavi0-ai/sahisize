/**
 * Zod schemas for small site data files under src/content: SEO maps, exam families, the
 * Hindi exam list, other-documents aliases, the Govt ID section. Pure module.
 */
import { z } from 'zod';
import { DOC_TYPES, EXAM_GROUPS, OUTPUT_FORMATS, PHYSICAL_UNITS, PRINT_PHOTO_SLUGS } from '@/config/exams';
import { LocalizedTextSchema, SlugSchema, IsoDateSchema } from './preset';

const nonEmpty = z.string().trim().min(1);

const FaqCopySchema = z.object({ q: nonEmpty, a: nonEmpty }).strict();

/** English copy of an exam-day print photo page (/exam/{slug}/{print slug}). */
export const PrintPhotoSeoSchema = z
  .object({
    /** Primary keyword; must appear in title, H1, description and lead (checked in exam-print.ts). */
    keyword: nonEmpty,
    title: nonEmpty,
    h1: nonEmpty,
    description: nonEmpty,
    /** First paragraph: answers the query in one or two sentences. */
    lead: nonEmpty,
    steps: z.array(z.object({ name: nonEmpty, text: nonEmpty }).strict()).min(2),
    faq: z.array(FaqCopySchema).min(3),
  })
  .strict();
export type PrintPhotoSeo = z.infer<typeof PrintPhotoSeoSchema>;

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
    faq: z.array(FaqCopySchema).optional(),
    /** Copy for the exam's print photo pages, keyed by PrintPhoto slug. */
    printPhotos: z.record(z.enum(PRINT_PHOTO_SLUGS), PrintPhotoSeoSchema).optional(),
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
            /**
             * All given fields must match the preset. `slugs` lists members explicitly, for a
             * family no group or body describes (UGC NET + CSIR NET are both NTA exams).
             */
            match: z
              .object({
                group: z.enum(EXAM_GROUPS).optional(),
                body: nonEmpty.optional(),
                slugs: z.array(SlugSchema).min(1).optional(),
              })
              .strict()
              .refine(
                (m) => m.group !== undefined || m.body !== undefined || m.slugs !== undefined,
                'match needs group, body or slugs',
              ),
            /** Overrides the file-wide minFamilySize (e.g. 2 for a two-exam comparison hub). */
            minSize: z.number().int().min(2).optional(),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();
export type FamiliesFile = z.infer<typeof FamiliesFileSchema>;
export type FamilyDef = FamiliesFile['families'][number];

/** Whether a preset belongs to a family (pure; shared by the hub pages and the content graph check). */
export function familyMatches(f: Pick<FamilyDef, 'match'>, p: { slug: string; group: string; body: string }): boolean {
  const m = f.match;
  return (
    (m.group === undefined || m.group === p.group) &&
    (m.body === undefined || m.body === p.body) &&
    (m.slugs === undefined || m.slugs.includes(p.slug))
  );
}

/** Published members a family needs before it gets a hub page. */
export function familyMinSize(f: Pick<FamilyDef, 'minSize'>, file: Pick<FamiliesFile, 'minFamilySize'>): number {
  return f.minSize ?? file.minFamilySize;
}

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
