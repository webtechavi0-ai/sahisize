/**
 * ★ Frozen contract (Phase 1). Astro content collections.
 * Only guides use astro:content (PLAN 3.1). Exam presets are plain JSON loaded by
 * src/content/presets/index.ts and are NOT a collection.
 *
 * Guides live in src/content/guides/{en,hi}/<slug>.mdx. Entry ids are "en/<slug>".
 * An English guide and its Hindi version share the same `slug` frontmatter.
 */
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug must be lowercase kebab-case');

const guides = defineCollection({
  // generateId: the default glob id is the `slug` frontmatter, which collides between
  // en/<slug> and hi/<slug>; use the path so ids are "en/<slug>" as documented above.
  loader: glob({
    pattern: '{en,hi}/**/*.mdx',
    base: './src/content/guides',
    generateId: ({ entry }) => entry.replace(/\.mdx$/, ''),
  }),
  schema: z
    .object({
      title: z.string().min(1).max(110),
      /** Meta description, 50-160 chars. */
      description: z.string().min(50).max(160),
      lang: z.enum(['en', 'hi']),
      /** URL slug; identical for the en and hi versions of a guide. */
      slug,
      /** ISO dates. */
      publishedAt: z.coerce.date(),
      updatedAt: z.coerce.date().optional(),
      /** Exam preset slugs to link to. */
      relatedExams: z.array(slug).default([]),
      /** Tool slugs from src/config/tools.ts. */
      relatedTools: z.array(slug).default([]),
      /** Sort order on /guides (lower first). */
      order: z.number().int().default(100),
      draft: z.boolean().default(false),
    })
    .strict(),
});

export const collections = { guides };
