/**
 * Static OG images, 1200×630 PNG, English (PLAN 3.14, QUESTIONS Q9).
 * /og/default.png, /og/home.png, /og/exams.png, /og/guides.png,
 * /og/exam/{slug}.png (document and Hindi pages reuse it), /og/tools/{slug}.png,
 * /og/guides/{slug}.png.
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { getPublishedPresets } from '@/content/presets';
import {
  COMPRESS_KB_RANGES,
  COMPRESS_KB_TARGETS,
  JPG_PDF_KB_TARGETS,
  MB_TO_KB_PATH,
  PDF_KB_TARGETS,
  TOOLS,
  compressRangePath,
} from '@/config/tools';
import { TAGLINE } from '@/config/site';
import { renderOgPng, type OgInput } from '@/seo/og-image';
import { docPhrase } from '@/seo/spec-text';
import toolNames from '@/i18n/ns/site.en.json';
import { camel } from '@/components/site/util';

const names = (toolNames as { site: { toolNames: Record<string, string> } }).site.toolNames;

export const getStaticPaths: GetStaticPaths = async () => {
  const out: { params: { path: string }; props: OgInput & Record<string, unknown> }[] = [
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
  for (const p of getPublishedPresets()) {
    out.push({
      params: { path: `exam/${p.slug}` },
      props: { title: p.name.en, subtitle: `${docPhrase(p.documents)} Size`, badge: p.cycle },
    });
  }
  for (const tool of TOOLS) {
    out.push({
      params: { path: `tools/${tool.slug}` },
      props: {
        title: names[camel(tool.slug)] ?? tool.slug,
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
  const guides = await getCollection('guides', (g) => g.data.lang === 'en' && !g.data.draft);
  for (const g of guides) {
    out.push({
      params: { path: `guides/${g.data.slug}` },
      props: { title: g.data.title, subtitle: 'SahiSize guide' },
    });
  }
  return out;
};

export const GET: APIRoute = async ({ props }) => {
  const png = await renderOgPng(props as OgInput);
  return new Response(png as unknown as BodyInit, {
    headers: { 'Content-Type': 'image/png' },
  });
};
