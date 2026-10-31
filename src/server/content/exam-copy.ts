import 'server-only';
/** Written exam copy (src/content/exam-copy/{lang}/{slug}.json) as structured blocks. */
import type { Lang } from '@/i18n/config';
import type { Block } from '@/lib/blocks';
import { content } from './registry';

/** The exam's written section, or null when no copy exists for that language. */
export function getExamCopy(slug: string, lang: Lang): Block[] | null {
  return content().examCopy[lang].get(slug)?.body ?? null;
}

export function hasExamCopy(slug: string, lang: Lang): boolean {
  return content().examCopy[lang].has(slug);
}
