/**
 * Static OG images, 1200×630 PNG, English.
 * /og/default.png, /og/home.png, /og/exams.png, /og/guides.png,
 * /og/exam/{slug}.png (document and Hindi pages reuse it), /og/tools/{slug}.png,
 * /og/guides/{slug}.png.
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
import { TAGLINE } from '@/config/site';
import { t } from '@/i18n/server';
import { renderOgPng, type OgInput } from '@/seo/og-render';
import { docPhrase } from '@/seo/spec-text';
import { listGuides, publishedPresets } from '@/server/content';
import { toolNameKey } from '@/components/site/util';

function ogEntries() {
  const out: { params: { path: string }; props: OgInput }[] = [
    {
      params: { path: 'default' },
      props: { title: 'SahiSize', subtitle: 'Exam photo & signature resizer' },
    },
    {
      params: { path: 'home' },
      props: { title: 'Exam form photo & signature', subtitle: TAGLINE.en },
    },
    {
      params: { path: 'exams' },
      props: { title: 'All exams', subtitle: 'Photo, Signature & Document Sizes' },
    },
    { params: { path: 'guides' }, props: { title: 'Guides', subtitle: 'Exam form upload help' } },
  ];
  for (const p of publishedPresets()) {
    out.push({
      params: { path: `exam/${p.slug}` },
      props: { title: p.name.en, subtitle: `${docPhrase(p.documents)} Size`, badge: p.cycle },
    });
  }
  for (const slug of TOOL_SLUGS) {
    out.push({
      params: { path: `tools/${slug}` },
      props: {
        title: t('en', toolNameKey(slug)),
        subtitle: 'Free · On your device · No upload',
      },
    });
  }
  for (const n of COMPRESS_KB_TARGETS) {
    out.push({
      params: { path: `tools/compress-image-to-${n}kb` },
      props: { title: `Compress photo to ${n} KB`, subtitle: 'Exact size · No upload' },
    });
  }
  for (const n of PDF_KB_TARGETS) {
    out.push({
      params: { path: `tools/compress-pdf-to-${n}kb` },
      props: { title: `Compress PDF to ${n} KB`, subtitle: 'Exact size · No upload' },
    });
  }
  for (const n of JPG_PDF_KB_TARGETS) {
    out.push({
      params: { path: `tools/jpg-to-pdf-under-${n}kb` },
      props: { title: `JPG to PDF under ${n} KB`, subtitle: 'Free · On your device · No upload' },
    });
  }
  for (const [a, b] of COMPRESS_KB_RANGES) {
    out.push({
      params: { path: compressRangePath(a, b).slice(1) },
      props: { title: `Photo ${a} KB to ${b} KB`, subtitle: 'Inside the range · No upload' },
    });
  }
  out.push({
    params: { path: MB_TO_KB_PATH.slice(1) },
    props: { title: 'Photo MB to KB', subtitle: 'Exact size · No upload' },
  });
  for (const g of listGuides('en')) {
    out.push({
      params: { path: `guides/${g.slug}` },
      props: { title: g.title, subtitle: 'SahiSize guide' },
    });
  }
  return out;
}

export const dynamic = 'force-static';
export const dynamicParams = false;

/** Segments such as ['default.png'] or ['exam', 'ssc-cgl.png']. */
export function generateStaticParams() {
  return ogEntries().map((e) => ({ path: `${e.params.path}.png`.split('/') }));
}

export async function GET(_req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const key = path.join('/').replace(/\.png$/, '');
  const entry = ogEntries().find((e) => e.params.path === key);
  if (!entry) return new Response('Not found', { status: 404 });
  const png = await renderOgPng(entry.props);
  return new Response(png as unknown as BodyInit, {
    headers: { 'Content-Type': 'image/png' },
  });
}
