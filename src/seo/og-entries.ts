import 'server-only';
/**
 * Every static OG image the /og route renders (1200×630 PNG, English text only: satori
 * cannot shape Devanagari). Keys are paths under /og without ".png":
 *   default, home, exams, guides, exam/{slug} (document and Hindi exam pages reuse it),
 *   tools/{slug}, guides/{slug}.
 *
 * Guides: GuideLayout always points og:image and the Article image at
 * /og/guides/{slug}.png, also for a Hindi-only guide (no English page). Those get a card
 * from the Latin-script lead of the Hindi title ("Photo ko KB me kaise kare"), else a
 * generic guide card, so no guide image can 404.
 */
import {
  COMPRESS_KB_RANGES,
  COMPRESS_KB_TARGETS,
  JPG_PDF_KB_TARGETS,
  MB_TO_KB_PATH,
  PDF_KB_TARGETS,
  TOOL_SLUGS,
  compressRangePath,
} from '@/config/tools';
import { SITE_NAME, TAGLINE } from '@/config/site';
import { t } from '@/i18n/server';
import { docPhrase } from '@/seo/spec-text';
import { latinLead } from '@/seo/text';
import { listGuides, publishedPresets } from '@/server/content';
import { toolNameKey } from '@/components/site/util';
import type { OgInput } from './og-render';

export interface OgEntry {
  /** Path under /og without the extension, e.g. "exam/ssc-cgl". */
  path: string;
  props: OgInput;
}

const NO_UPLOAD = 'Free · On your device · No upload';
const GUIDE_SUBTITLE = `${SITE_NAME} guide`;

export function ogEntries(): OgEntry[] {
  const out: OgEntry[] = [
    { path: 'default', props: { title: SITE_NAME, subtitle: 'Exam photo & signature resizer' } },
    { path: 'home', props: { title: 'Exam form photo & signature', subtitle: TAGLINE.en } },
    { path: 'exams', props: { title: 'All exams', subtitle: 'Photo, Signature & Document Sizes' } },
    { path: 'guides', props: { title: 'Guides', subtitle: 'Exam form upload help' } },
  ];
  for (const p of publishedPresets()) {
    out.push({
      path: `exam/${p.slug}`,
      props: { title: p.name.en, subtitle: `${docPhrase(p.documents)} Size`, badge: p.cycle },
    });
  }
  for (const slug of TOOL_SLUGS) {
    out.push({ path: `tools/${slug}`, props: { title: t('en', toolNameKey(slug)), subtitle: NO_UPLOAD } });
  }
  for (const n of COMPRESS_KB_TARGETS) {
    out.push({
      path: `tools/compress-image-to-${n}kb`,
      props: { title: `Compress photo to ${n} KB`, subtitle: 'Exact size · No upload' },
    });
  }
  for (const n of PDF_KB_TARGETS) {
    out.push({
      path: `tools/compress-pdf-to-${n}kb`,
      props: { title: `Compress PDF to ${n} KB`, subtitle: 'Exact size · No upload' },
    });
  }
  for (const n of JPG_PDF_KB_TARGETS) {
    out.push({ path: `tools/jpg-to-pdf-under-${n}kb`, props: { title: `JPG to PDF ${n} KB`, subtitle: NO_UPLOAD } });
  }
  for (const [a, b] of COMPRESS_KB_RANGES) {
    out.push({
      path: compressRangePath(a, b).slice(1),
      props: { title: `Photo ${a} KB to ${b} KB`, subtitle: 'Inside the range · No upload' },
    });
  }
  out.push({ path: MB_TO_KB_PATH.slice(1), props: { title: 'Photo MB to KB', subtitle: 'Exact size · No upload' } });

  const enGuides = listGuides('en');
  const enSlugs = new Set(enGuides.map((g) => g.slug));
  for (const g of enGuides) out.push({ path: `guides/${g.slug}`, props: { title: g.title, subtitle: GUIDE_SUBTITLE } });
  for (const g of listGuides('hi')) {
    if (enSlugs.has(g.slug)) continue;
    out.push({ path: `guides/${g.slug}`, props: { title: latinLead(g.title) ?? 'Exam form guide', subtitle: GUIDE_SUBTITLE } });
  }
  return out;
}

/** Path ("guides/x") -> entry. */
export function ogEntry(path: string): OgEntry | undefined {
  return ogEntries().find((e) => e.path === path);
}
