/**
 * Zod schema for tool and ID-document page copy (src/content/tools/{lang}/{slug}.json,
 * src/content/id-documents/copy/{lang}.json). Plain text only; links are English site paths,
 * localized at load time. Pure module.
 */
import { z } from 'zod';
import { SlugSchema } from './preset';
import { FaqSchema } from './pages';

const nonEmpty = z.string().trim().min(1);

export const LinkSchema = z
  .object({
    href: z.string().regex(/^\/(?!hi(?:\/|$))[^\s]*$|^https:\/\/\S+$/, 'href must be an English site path or https URL'),
    label: nonEmpty,
  })
  .strict();
export type ContentLink = z.infer<typeof LinkSchema>;

/** Links computed at load time from the presets, so they follow preset changes. */
export const DynamicLinksSchema = z.discriminatedUnion('source', [
  /** These exam pages; each must be published (and have a verified PDF document when asked). */
  z
    .object({
      source: z.literal('exams'),
      slugs: z.array(SlugSchema).min(1),
      requireVerifiedPdf: z.boolean().optional(),
    })
    .strict(),
  /** Exams with an image document of exactly min–max KB, season order. */
  z
    .object({
      source: z.literal('exams-with-range'),
      min: z.number().positive(),
      max: z.number().positive(),
      limit: z.number().int().positive(),
    })
    .strict(),
  /** Exams whose photo needs the name-and-date strip. */
  z.object({ source: z.literal('name-date-exams') }).strict(),
]);
export type DynamicLinks = z.infer<typeof DynamicLinksSchema>;

export const StaticSectionSchema = z
  .object({
    h2: nonEmpty,
    paras: z.array(nonEmpty),
    list: z.array(nonEmpty).optional(),
    links: z.array(LinkSchema).optional(),
    dynamicLinks: DynamicLinksSchema.optional(),
  })
  .strict();

/** A whole section generated from the presets (omitted when there is nothing to list). */
export const DynamicSectionSchema = z
  .object({ dynamic: z.literal('exams-with-max-kb'), n: z.number().positive() })
  .strict();

export const SectionDataSchema = z.union([StaticSectionSchema, DynamicSectionSchema]);
export type SectionData = z.infer<typeof SectionDataSchema>;

export const StepSchema = z.object({ name: nonEmpty, text: nonEmpty }).strict();

export const ToolCopyDataSchema = z
  .object({
    title: nonEmpty,
    description: nonEmpty,
    h1: nonEmpty,
    intro: nonEmpty,
    steps: z.array(StepSchema),
    faq: z.array(FaqSchema),
    sections: z.array(SectionDataSchema),
    /**
     * Replacement strings (by dot path, e.g. "steps.2.text") used when the page's dynamic
     * data is empty; strings elsewhere may then contain {placeholders}.
     */
    withoutExams: z.record(nonEmpty).optional(),
  })
  .strict();
export type ToolCopyData = z.infer<typeof ToolCopyDataSchema>;

export const IdHubCopySchema = z
  .object({
    title: nonEmpty,
    description: nonEmpty,
    h1: nonEmpty,
    intro: nonEmpty,
    sections: z.array(StaticSectionSchema),
    faq: z.array(FaqSchema),
    labels: z
      .object({
        specTitle: nonEmpty,
        colDocument: nonEmpty,
        colSize: nonEmpty,
        colKb: nonEmpty,
        colFormat: nonEmpty,
        colSource: nonEmpty,
        pagesTitle: nonEmpty,
        notCoveredTitle: nonEmpty,
        notCoveredIntro: nonEmpty,
        open: nonEmpty,
      })
      .strict(),
  })
  .strict();

export const IdCopyFileSchema = z
  .object({
    hub: IdHubCopySchema,
    pages: z.record(SlugSchema, ToolCopyDataSchema),
  })
  .strict();
export type IdCopyFile = z.infer<typeof IdCopyFileSchema>;
