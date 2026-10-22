/** Card text helpers for ExamCard: short exam name and short document labels. */
import { t } from '@/i18n';
import type { Lang } from '@/config/site';
import type { ExamPreset } from '@/content/presets/schema';
import { latinTitleName } from '@/seo/exam-names';

/** Short card name: "SBI Clerk", "IBPS RRB Clerk"; Hindi drops the parenthetical. */
export function cardName(p: Pick<ExamPreset, 'slug' | 'name'>, lang: Lang): string {
  if (lang === 'en') return latinTitleName(p);
  return p.name.hi.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Short document labels, in preset order, duplicates merged ("Signature ×2"). Live-photo
 * exams list "Photo (live)" first, so the photo is never silently missing.
 * Returns at most `max` labels plus the count of the rest.
 */
export function cardDocLabels(
  p: Pick<ExamPreset, 'documents' | 'photoUploadReplacedByLive'>,
  lang: Lang,
  max = 3,
): { labels: string[]; more: number } {
  const counts = new Map<string, number>();
  if (p.photoUploadReplacedByLive) counts.set(t(lang, 'site.exams.docShort.photoLive'), 1);
  for (const d of p.documents) {
    const k = t(lang, `site.exams.docShort.${d.doc}`);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const all = [...counts].map(([k, n]) => (n > 1 ? `${k} ×${n}` : k));
  return { labels: all.slice(0, max), more: Math.max(0, all.length - max) };
}
