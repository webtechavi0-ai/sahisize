/**
 * Zod schemas for written page content: guides, exam copy, exam-family hub copy.
 * Pure module (no fs, no server-only).
 */
import { z } from 'zod';
import { LOCALES } from '@/i18n/config';
import { BodySchema } from './blocks';
import { SlugSchema } from './preset';

const nonEmpty = z.string().trim().min(1);

/** ISO timestamp or YYYY-MM-DD. */
const IsoDateTimeSchema = z
  .string()
  .refine((s) => /^\d{4}-\d{2}-\d{2}(T[\d:.]+Z)?$/.test(s) && !Number.isNaN(Date.parse(s)), 'must be an ISO date');

export const FaqSchema = z.object({ q: nonEmpty, a: nonEmpty }).strict();
export type Faq = z.infer<typeof FaqSchema>;

/** src/content/guides/{lang}/{slug}.json */
export const GuideSchema = z
  .object({
    title: nonEmpty,
    /** <title> when it differs from the H1. */
    seoTitle: nonEmpty.optional(),
    description: nonEmpty,
    lang: z.enum(LOCALES),
    slug: SlugSchema,
    publishedAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema.optional(),
    relatedExams: z.array(SlugSchema).default([]),
    relatedTools: z.array(SlugSchema).default([]),
    order: z.number().int().default(100),
    draft: z.boolean().default(false),
    body: BodySchema.min(1),
  })
  .strict();
export type Guide = z.infer<typeof GuideSchema>;

/** src/content/exam-copy/{lang}/{slug}.json: the written section of an exam page. */
export const ExamCopySchema = z.object({ body: BodySchema.min(1) }).strict();
export type ExamCopy = z.infer<typeof ExamCopySchema>;

/** src/content/hub-copy/{lang}/{family}.json */
export const HubCopySchema = z
  .object({
    title: nonEmpty,
    description: nonEmpty,
    h1: nonEmpty,
    intro: nonEmpty,
    tableH2: nonEmpty,
    linksH2: nonEmpty,
    faqH2: nonEmpty,
    faq: z.array(FaqSchema).min(3),
    body: BodySchema.min(1),
  })
  .strict();
export type HubCopy = z.infer<typeof HubCopySchema>;
