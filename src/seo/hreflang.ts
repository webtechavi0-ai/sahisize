/**
 * hreflang pairs (SPEC 9.1, PLAN 3.11): en-IN <-> hi-IN, emitted ONLY when the
 * counterpart page exists. x-default always points at the English page.
 */
import { absoluteUrl } from '@/config/site';
import hiTopExams from '@/i18n/hi-top-exams.json';
import { getPublishedPresets } from '@/content/presets';

export interface Alternates {
  /** English path, e.g. "/exam/ibps-po". */
  en: string;
  /** Hindi path, e.g. "/hi/exam/ibps-po", or null when there is no Hindi page. */
  hi: string | null;
}

export interface HreflangLink {
  hreflang: 'en-IN' | 'hi-IN' | 'x-default';
  href: string;
}

export function hreflangLinks(alt: Alternates): HreflangLink[] {
  if (!alt.hi) return [];
  return [
    { hreflang: 'en-IN', href: absoluteUrl(alt.en) },
    { hreflang: 'hi-IN', href: absoluteUrl(alt.hi) },
    { hreflang: 'x-default', href: absoluteUrl(alt.en) },
  ];
}

/**
 * Exams that get a Hindi page: hi-top-exams.json filtered to existing published
 * presets, in that file's order.
 */
export function hindiExamSlugs(): string[] {
  const pub = new Set(getPublishedPresets().map((p) => p.slug));
  return (hiTopExams as string[]).filter((s) => pub.has(s));
}

export function hasHindiExam(slug: string): boolean {
  return hindiExamSlugs().includes(slug);
}

/** Hindi tool pages (src/app/hi/tools/*), by slug. Keep in sync with the routes. */
const HI_TOOL_SLUGS = [
  'compress-image-20kb-to-50kb',
  'compress-image-to-100kb',
  'compress-image-to-10kb',
  'compress-image-to-200kb',
  'compress-image-to-20kb',
  'compress-image-to-30kb',
  'compress-image-to-50kb',
  'compress-image',
  'compress-pdf-to-200kb',
  'compress-pdf-to-500kb',
  'images-to-pdf',
  'increase-image-size-in-kb',
  'jpg-to-pdf-under-300kb',
  'name-date-on-photo',
  'passport-size-photo',
  'photo-3-5x4-5-cm',
  'resize-image',
  'signature-resize',
];
const hiToolFiles = new Set<string>(HI_TOOL_SLUGS);
export function hindiToolPages(): Set<string> {
  return hiToolFiles;
}

/** Hindi counterpart of an English tool path, or null. */
export function hindiToolPath(enPath: string): string | null {
  const name = enPath.replace(/^\/tools\/?/, '') || 'index';
  const files = hindiToolPages();
  if (files.has(name)) return `/hi${enPath === '/tools' ? '/tools' : enPath}`;
  if (/^compress-image-to-\d+kb$/.test(name) && files.has('compress-image-to-[n]kb'))
    return `/hi${enPath}`;
  return null;
}

/**
 * Hindi counterpart for the static English routes C owns. Exam, kit and guide pages
 * pass their own alternates (they know their slug sets).
 */
export function staticAlternates(enPath: string): Alternates {
  const withHindi = new Set(['/', '/exams', '/guides']);
  if (withHindi.has(enPath)) return { en: enPath, hi: enPath === '/' ? '/hi' : `/hi${enPath}` };
  if (enPath.startsWith('/tools')) return { en: enPath, hi: hindiToolPath(enPath) };
  return { en: enPath, hi: null };
}
