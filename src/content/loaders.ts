/**
 * Server-only loaders for the JSON content under src/content/{guides,exam-copy,hub-copy}.
 * Each file is `{ ...frontmatter, html }`: the markdown body is pre-rendered to HTML.
 * Read with fs at build time (Next.js server components / generateStaticParams).
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Lang } from '@/config/site';

const ROOT = join(process.cwd(), 'src', 'content');

export interface Guide {
  title: string;
  seoTitle?: string;
  description: string;
  lang: Lang;
  slug: string;
  /** ISO date strings. */
  publishedAt: string;
  updatedAt?: string;
  relatedExams: string[];
  relatedTools: string[];
  order: number;
  draft: boolean;
  html: string;
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

const guideCache = new Map<Lang, Guide[]>();

/** Published guides for a language, sorted by `order`. */
export function getGuides(lang: Lang): Guide[] {
  let list = guideCache.get(lang);
  if (!list) {
    const dir = join(ROOT, 'guides', lang);
    list = readdirSync(dir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => {
        const g = readJson<Guide>(join(dir, f));
        return { ...g, order: g.order ?? 100, draft: g.draft ?? false, relatedExams: g.relatedExams ?? [], relatedTools: g.relatedTools ?? [] };
      })
      .filter((g) => !g.draft)
      .sort((a, b) => a.order - b.order);
    guideCache.set(lang, list);
  }
  return list;
}

export function getGuide(lang: Lang, slug: string): Guide | undefined {
  return getGuides(lang).find((g) => g.slug === slug);
}

/** True when the other-language version of a guide exists. */
export function hasGuideCounterpart(lang: Lang, slug: string): boolean {
  return !!getGuide(lang === 'en' ? 'hi' : 'en', slug);
}

/** Per-exam written copy HTML (SPEC 9.4), or null if the file is missing. */
export function getExamCopyHtml(lang: Lang, slug: string): string | null {
  const p = join(ROOT, 'exam-copy', lang, `${slug}.json`);
  return existsSync(p) ? readJson<{ html: string }>(p).html : null;
}
