/**
 * Exam-family hub copy: src/content/hub-copy/en/<family>.json. Metadata holds the title,
 * description, H1, intro, section headings and FAQ; `html` holds the written sections.
 * English only. Validated at build time (an invalid file throws).
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import type { FamilySlug } from './families';

const HubFrontmatterSchema = z
  .object({
    title: z.string().min(1),
    description: z.string().min(1),
    h1: z.string().min(1),
    intro: z.string().min(1),
    tableH2: z.string().min(1),
    linksH2: z.string().min(1),
    faqH2: z.string().min(1),
    faq: z.array(z.object({ q: z.string().min(1), a: z.string().min(1) }).strict()).min(3),
  })
  .strict();
export type HubFrontmatter = z.infer<typeof HubFrontmatterSchema>;

export interface HubCopy extends HubFrontmatter {
  /** Pre-rendered HTML of the written sections. */
  html: string;
}

export function hubCopy(slug: FamilySlug): HubCopy {
  const file = join(process.cwd(), 'src', 'content', 'hub-copy', 'en', `${slug}.json`);
  if (!existsSync(file)) throw new Error(`Missing hub copy: src/content/hub-copy/en/${slug}.json`);
  const { html, ...frontmatter } = JSON.parse(readFileSync(file, 'utf8')) as { html: string };
  const res = HubFrontmatterSchema.safeParse(frontmatter);
  if (!res.success)
    throw new Error(`Invalid hub copy for ${slug}: ${res.error.message}`);
  return { ...res.data, html };
}
