/**
 * Exam-family hub copy: src/content/hub-copy/en/<family>.md. Frontmatter holds the title,
 * description, H1, intro, section headings and FAQ; the body holds the written sections.
 * English only. Validated at build time (an invalid file throws).
 */
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

interface HubModule {
  frontmatter: unknown;
  Content: (props: Record<string, unknown>) => unknown;
}

const mods = import.meta.glob<HubModule>('/src/content/hub-copy/en/*.md', { eager: true });

export interface HubCopy extends HubFrontmatter {
  Content: HubModule['Content'];
}

export function hubCopy(slug: FamilySlug): HubCopy {
  const mod = mods[`/src/content/hub-copy/en/${slug}.md`];
  if (!mod) throw new Error(`Missing hub copy: src/content/hub-copy/en/${slug}.md`);
  const res = HubFrontmatterSchema.safeParse(mod.frontmatter);
  if (!res.success)
    throw new Error(`Invalid hub copy frontmatter for ${slug}: ${res.error.message}`);
  return { ...res.data, Content: mod.Content };
}
