import 'server-only';
/**
 * Exam-day print photo pages (/exam/{slug}/{print slug}, e.g. /exam/neet-ug/postcard-photo):
 * a photo the notice asks candidates to print and carry, never upload. Specs come from the
 * preset (`printPhotos`, cited against the preset's notification); the keyword copy comes from
 * seo/exam-seo.json (`printPhotos`). Both must exist for a page to be built.
 */
import type { PrintPhotoSlug } from '@/config/exams';
import { examDocPath } from '@/config/routes';
import type { ExamPreset, PrintPhoto } from '@/lib/presets';
import { DESC_MAX, TITLE_MAX, textLength } from '@/seo/text';
import { examSeo } from './exam-meta';
import { publishedPresets } from './presets';
import type { PrintPhotoSeo } from './schemas/site-data';

export type { PrintPhotoSeo } from './schemas/site-data';

export interface PrintPhotoPage {
  preset: ExamPreset;
  photo: PrintPhoto;
  copy: PrintPhotoSeo;
  path: string;
}

const lower = (s: string) => s.toLowerCase().replace(/\s+/g, ' ');

/** Fails the build when the copy breaks the page's SEO rules (one primary keyword, lengths). */
function check(key: string, c: PrintPhotoSeo): void {
  const errs: string[] = [];
  if (textLength(c.title) > TITLE_MAX) errs.push(`title ${textLength(c.title)} > ${TITLE_MAX}`);
  if (textLength(c.description) > DESC_MAX) errs.push(`description ${textLength(c.description)} > ${DESC_MAX}`);
  const kw = lower(c.keyword);
  for (const [k, v] of Object.entries({ title: c.title, h1: c.h1, description: c.description, lead: c.lead }))
    if (!lower(v).includes(kw)) errs.push(`keyword "${c.keyword}" missing from ${k}`);
  if (errs.length) throw new Error(`seo/exam-seo.json ${key} printPhotos: ${errs.join('; ')}`);
}

function pageFor(p: ExamPreset, slug: PrintPhotoSlug): PrintPhotoPage | null {
  const photo = p.printPhotos?.find((x) => x.slug === slug);
  const copy = examSeo(p.slug)?.printPhotos?.[slug];
  if (!photo || !copy) return null;
  check(`${p.slug}/${slug}`, copy);
  return { preset: p, photo, copy, path: examDocPath(p.slug, slug) };
}

/** Every built print photo page of one kind (for generateStaticParams and the sitemap). */
export function printPhotoPages(slug: PrintPhotoSlug): PrintPhotoPage[] {
  return publishedPresets()
    .map((p) => pageFor(p, slug))
    .filter((x): x is PrintPhotoPage => x !== null);
}

export function getPrintPhotoPage(examSlug: string, slug: PrintPhotoSlug): PrintPhotoPage | undefined {
  return printPhotoPages(slug).find((x) => x.preset.slug === examSlug);
}

/** Print photo pages of one exam (links from the exam's other pages). */
export function printPhotoPagesOf(p: ExamPreset): PrintPhotoPage[] {
  return (p.printPhotos ?? [])
    .map((x) => pageFor(p, x.slug))
    .filter((x): x is PrintPhotoPage => x !== null);
}
