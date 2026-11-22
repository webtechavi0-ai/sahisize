/**
 * zod schema for doc-seo.json: keyword copy for exam-document pages that the template
 * cannot produce (GA winners, C3 "resize"/"resizer" photo pages) plus the guide links per
 * document type. Strings are templates: {short}, {cycle}, {kb}, {min}, {max}, … are filled
 * from the preset (logic.ts factVars), so no size is typed by hand.
 */
import { z } from 'zod';
import { FAQ_TOPICS } from './logic';

const text = z.string().trim().min(2);
const faq = z.object({ q: text, a: text }).strict();

const copy = z
  .object({
    /** Primary keyword; must appear as a phrase in title, H1, description and lead (checked). */
    primary: text,
    /** Title core (fitTitle adds " | SahiSize" when it fits in 60). */
    title: text,
    h1: text,
    /** 140–160 code points after filling. */
    description: text,
    /** First sentence(s) of the page, before the generic intro tail. */
    lead: text,
    /** Freshness line under the answer box. */
    freshness: text.optional(),
    faqs: z.array(faq).default([]),
  })
  .strict();

const link = z
  .object({
    /** Site path in English; a template is allowed ("/tools/compress-pdf-to-{max}kb"). */
    href: z.string().regex(/^\/[a-z0-9{}/-]*$/),
    text: z.object({ en: text, hi: text.optional() }).strict(),
  })
  .strict();

const page = z
  .object({
    en: copy,
    /** Present => a /hi/exam/{slug}/{doc} page is generated with hreflang to the English one. */
    hi: copy.optional(),
    /** Name of a shared FAQ set in `faqSets` (added after the page's own FAQs). */
    faqSet: z.string().optional(),
    /** Exam FAQs to show on this page, by the preset's English question (exact). */
    presetFaqs: z.array(text).default([]),
    /** Generated FAQ topics this page answers itself. */
    replaces: z.array(z.enum(FAQ_TOPICS)).default([]),
    links: z.array(link).default([]),
  })
  .strict();

const docType = z.enum(['photo', 'signature', 'thumb', 'declaration', 'certificate', 'other']);

export const docSeoSchema = z
  .object({
    $comment: z.string().optional(),
    /** Guide slugs linked from every document page of a type (English slugs; Hindi only if the guide exists in Hindi). */
    guides: z.record(docType, z.array(z.string().regex(/^[a-z0-9-]+$/))),
    faqSets: z.record(z.string(), z.object({ en: z.array(faq), hi: z.array(faq).optional() }).strict()).default({}),
    /** Keyed "{exam slug}/{doc slug}". */
    pages: z.record(z.string().regex(/^[a-z0-9-]+\/[a-z0-9-]+$/), page),
  })
  .strict();

export type DocSeoData = z.infer<typeof docSeoSchema>;
export type DocSeoPage = DocSeoData['pages'][string];
export type DocSeoCopy = DocSeoPage['en'];
