import { t } from '@/i18n/server';
import { type Lang } from '@/i18n/config';
import { type ExamPreset } from '@/lib/presets';
import { kbText } from '@/seo/spec-text';
import { latinTitleName } from '@/server/content';
/** Card text helpers for ExamCard: short exam name and short document labels. */

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

/**
 * Compact sizes for cards: "Photo 20–50 KB · Signature 10–20 KB", or "Photo (live) ·
 * Signature 30–49 KB" for live-photo exams. Only verified sizes; null when nothing to show.
 */
export function cardSizes(p: Pick<ExamPreset, 'documents' | 'photoUploadReplacedByLive'>, lang: Lang): string | null {
  const ok = (type: string) => p.documents.find((d) => d.doc === type && d.maxKB !== null && !d.toVerify);
  const photo = ok('photo');
  const sign = ok('signature');
  const parts = [
    p.photoUploadReplacedByLive
      ? t(lang, 'site.exams.docShort.photoLive')
      : photo
        ? `${t(lang, 'site.exams.docShort.photo')} ${kbText(photo, lang)}`
        : null,
    sign ? `${t(lang, 'site.exams.docShort.signature')} ${kbText(sign, lang)}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
}

const HI_MONTHS: Record<string, string> = {
  January: 'जनवरी', February: 'फ़रवरी', March: 'मार्च', April: 'अप्रैल', May: 'मई', June: 'जून',
  July: 'जुलाई', August: 'अगस्त', September: 'सितंबर', October: 'अक्टूबर', November: 'नवंबर', December: 'दिसंबर',
};

/** Year chip text: "December 2026" on /hi becomes "दिसंबर 2026" (numbers stay Latin). */
export function cardCycle(cycle: string, lang: Lang): string {
  if (lang !== 'hi') return cycle;
  return cycle.replace(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/g, (m) => HI_MONTHS[m] ?? m);
}

/**
 * Splits a sizes line so each "value KB" pair can be kept on one line:
 * "Photo 20–50 KB · Signature 10–50 KB" -> ["Photo ", "20–50 KB", " · Signature ", "10–50 KB", ""].
 * Odd indexes are the pairs.
 */
export function splitKbPairs(text: string): string[] {
  return text.split(/(\S+ KB)/);
}
