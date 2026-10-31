import 'server-only';
/** Written exam copy (src/content/exam-copy/{lang}/{slug}.json) as structured blocks. */
import type { Lang } from '@/i18n/config';
import type { Block } from '@/lib/blocks';
import { localizeBlocks } from './hindi';
import { content } from './registry';

/** The exam's written section (links localized), or null when no copy exists for that language. */
export function getExamCopy(slug: string, lang: Lang): Block[] | null {
  const body = content().examCopy[lang].get(slug)?.body;
  return body ? localizeBlocks(body, lang) : null;
}

export function hasExamCopy(slug: string, lang: Lang): boolean {
  return content().examCopy[lang].has(slug);
}
