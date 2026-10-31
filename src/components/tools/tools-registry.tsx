/**
 * Dispatch table for /tools/[slug] and /hi/tools/[slug] (replaces ~44 thin Astro pages).
 * SERVER-ONLY: pulls in preset lookups and page copy. Islands are 'use client' components.
 */
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import type { Lang } from '@/config/site';
import {
  COMPRESS_KB_RANGES,
  COMPRESS_KB_TARGETS,
  JPG_PDF_KB_TARGETS,
  MB_TO_KB_PATH,
  PDF_KB_TARGETS,
  compressPdfToKbPath,
  compressRangePath,
  jpgToPdfUnderKbPath,
} from '@/config/tools';
import { hindiToolPages } from '@/seo/hreflang';
import ToolLayout, { toolMetadata, type ToolLayoutProps } from '@/components/layouts/ToolLayout';
import ToolContent from '@/components/tools/ToolContent';
import { toolDict } from '@/components/tools/dict';
import type { ToolCopy } from '@/components/tools/copy/types';
import { compressImageCopy, compressKbCopy } from '@/components/tools/copy/compress';
import { compressRangeCopy, mbToKbCopy } from '@/components/tools/copy/kb-ranges';
import { compressPdfKbCopy, jpgToPdfKbCopy } from '@/components/tools/copy/pdf-kb';
import { compressPdfCopy, imagesToPdfCopy } from '@/components/tools/copy/pdf';
import { convertCopy, resizeCopy } from '@/components/tools/copy/resize-convert';
import { customPresetCopy, batchCopy, photoSheetCopy } from '@/components/tools/copy/more';
import { declarationCopy, signatureCopy, thumbCopy } from '@/components/tools/copy/ink';
import { increaseCopy } from '@/components/tools/copy/increase';
import { nameDateCopy } from '@/components/tools/copy/name-date';
import { sizePageCopy } from '@/components/tools/copy/sizes';
import { sizePreset, type SizePresetPage } from '@/components/tools/size-presets';
import { declarationExams, sizeOptions } from '@/components/tools/presets-server';
import { nameDateExams } from '@/components/tools/name-date-server';
import ToolBatch from '@/islands/tools/ToolBatch';
import ToolCompress from '@/islands/tools/ToolCompress';
import ToolCompressPdf from '@/islands/tools/ToolCompressPdf';
import ToolConvert from '@/islands/tools/ToolConvert';
import ToolCustomPreset from '@/islands/tools/ToolCustomPreset';
import ToolDeclaration from '@/islands/tools/ToolDeclaration';
import ToolImagesToPdf from '@/islands/tools/ToolImagesToPdf';
import ToolIncrease from '@/islands/tools/ToolIncrease';
import ToolNameDate from '@/islands/tools/ToolNameDate';
import ToolPhotoSheet from '@/islands/tools/ToolPhotoSheet';
import ToolResize from '@/islands/tools/ToolResize';
import ToolSignature from '@/islands/tools/ToolSignature';
import ToolThumb from '@/islands/tools/ToolThumb';

type ToolSlugName = ToolLayoutProps['tool'];

interface Resolved {
  tool: ToolSlugName;
  /** English path, e.g. "/tools/compress-image-to-20kb". */
  path: string;
  copy: ToolCopy;
  island: ReactNode;
  noindex?: boolean;
}

const SIZE_PAGES: SizePresetPage[] = [
  'photo-3-5x4-5-cm',
  'resize-image-in-cm',
  'resize-image-in-mm',
  'passport-size-photo',
  'postcard-size-photo',
  'stamp-size-photo',
];

const EN_STATIC = [
  'batch-compress',
  'compress-image',
  'compress-pdf',
  'convert-image',
  'custom-preset',
  'handwritten-declaration',
  'images-to-pdf',
  'increase-image-size-in-kb',
  'mb-to-kb-photo',
  'name-date-on-photo',
  'passport-photo-sheet',
  'resize-image',
  'signature-resize',
  'thumb-impression',
  ...SIZE_PAGES,
];

function inList(list: readonly number[], n: number): boolean {
  return list.includes(n);
}

/** Every slug (path segment after /tools/) the old site emitted for a language. */
export function toolSlugs(lang: Lang): string[] {
  if (lang === 'hi') return [...hindiToolPages()];
  return [
    ...EN_STATIC,
    ...COMPRESS_KB_TARGETS.map((n) => `compress-image-to-${n}kb`),
    ...COMPRESS_KB_RANGES.map(([a, b]) => `compress-image-${a}kb-to-${b}kb`),
    ...PDF_KB_TARGETS.map((n) => `compress-pdf-to-${n}kb`),
    ...JPG_PDF_KB_TARGETS.map((n) => `jpg-to-pdf-under-${n}kb`),
  ];
}

function resolve(lang: Lang, slug: string): Resolved | null {
  const dict = toolDict(lang);
  const path = `/tools/${slug}`;
  let m: RegExpMatchArray | null;

  if ((m = slug.match(/^compress-image-to-(\d+)kb$/))) {
    const n = Number(m[1]);
    if (!inList(COMPRESS_KB_TARGETS, n)) return null;
    return {
      tool: 'compress-image',
      path,
      copy: compressKbCopy(n, lang),
      island: <ToolCompress lang={lang} dict={dict} initialKB={n} />,
    };
  }
  if ((m = slug.match(/^compress-image-(\d+)kb-to-(\d+)kb$/))) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (!COMPRESS_KB_RANGES.some(([x, y]) => x === a && y === b)) return null;
    return {
      tool: 'compress-image',
      path: compressRangePath(a, b),
      copy: compressRangeCopy(a, b, lang),
      island: <ToolCompress lang={lang} dict={dict} initialKB={b} initialMinKB={a} />,
    };
  }
  if ((m = slug.match(/^compress-pdf-to-(\d+)kb$/))) {
    const n = Number(m[1]);
    if (!inList(PDF_KB_TARGETS, n)) return null;
    return {
      tool: 'compress-pdf',
      path: compressPdfToKbPath(n),
      copy: compressPdfKbCopy(n, lang),
      island: <ToolCompressPdf lang={lang} dict={dict} initialKB={n} />,
    };
  }
  if ((m = slug.match(/^jpg-to-pdf-under-(\d+)kb$/))) {
    const n = Number(m[1]);
    if (!inList(JPG_PDF_KB_TARGETS, n)) return null;
    return {
      tool: 'images-to-pdf',
      path: jpgToPdfUnderKbPath(n),
      copy: jpgToPdfKbCopy(n, lang),
      island: <ToolImagesToPdf lang={lang} dict={dict} initialKB={n} />,
    };
  }
  if ((SIZE_PAGES as string[]).includes(slug)) {
    const page = slug as SizePresetPage;
    const p = sizePreset(page, lang);
    return {
      tool: page,
      path,
      copy: sizePageCopy(page, lang),
      island: <ToolResize lang={lang} dict={dict} initial={p.initial} sizes={p.sizes} sizesLabel={p.sizesLabel} />,
    };
  }

  switch (slug) {
    case 'compress-image':
      return {
        tool: 'compress-image',
        path,
        copy: compressImageCopy(lang),
        island: <ToolCompress lang={lang} dict={dict} initialKB={50} askSize />,
      };
    case 'mb-to-kb-photo':
      return {
        tool: 'compress-image',
        path: MB_TO_KB_PATH,
        copy: mbToKbCopy(),
        island: <ToolCompress lang={lang} dict={dict} initialKB={100} />,
      };
    case 'compress-pdf':
      return { tool: 'compress-pdf', path, copy: compressPdfCopy(), island: <ToolCompressPdf lang={lang} dict={dict} /> };
    case 'images-to-pdf':
      return { tool: 'images-to-pdf', path, copy: imagesToPdfCopy(lang), island: <ToolImagesToPdf lang={lang} dict={dict} /> };
    case 'resize-image':
      return { tool: 'resize-image', path, copy: resizeCopy(lang), island: <ToolResize lang={lang} dict={dict} /> };
    case 'convert-image':
      return { tool: 'convert-image', path, copy: convertCopy(), island: <ToolConvert lang={lang} dict={dict} /> };
    case 'increase-image-size-in-kb':
      return {
        tool: 'increase-image-size-in-kb',
        path,
        copy: increaseCopy(lang),
        island: <ToolIncrease lang={lang} dict={dict} initialMinKB={20} />,
      };
    case 'batch-compress':
      return { tool: 'batch-compress', path, copy: batchCopy(), island: <ToolBatch lang={lang} dict={dict} /> };
    case 'custom-preset':
      return {
        tool: 'custom-preset',
        path,
        copy: customPresetCopy(),
        island: <ToolCustomPreset lang={lang} dict={dict} />,
        noindex: true,
      };
    case 'passport-photo-sheet':
      return { tool: 'passport-photo-sheet', path, copy: photoSheetCopy(), island: <ToolPhotoSheet lang={lang} dict={dict} /> };
    case 'signature-resize':
      return {
        tool: 'signature-resize',
        path,
        copy: signatureCopy(lang),
        island: <ToolSignature lang={lang} dict={dict} options={sizeOptions('signature', lang)} />,
      };
    case 'thumb-impression':
      return {
        tool: 'thumb-impression',
        path,
        copy: thumbCopy(),
        island: <ToolThumb lang={lang} dict={dict} options={sizeOptions('thumb', lang)} />,
      };
    case 'handwritten-declaration': {
      const exams = declarationExams(lang).map(({ slug: s, name, text, toVerify }) => ({ slug: s, name, text, toVerify }));
      return {
        tool: 'handwritten-declaration',
        path,
        copy: declarationCopy(),
        island: <ToolDeclaration lang={lang} dict={dict} exams={exams} options={sizeOptions('declaration', lang)} />,
      };
    }
    case 'name-date-on-photo': {
      const exams = nameDateExams(lang);
      return {
        tool: 'name-date-on-photo',
        path,
        copy: nameDateCopy(lang, exams),
        island: <ToolNameDate lang={lang} dict={dict} options={exams.map((e) => e.option)} />,
      };
    }
  }
  return null;
}

function layoutProps(lang: Lang, r: Resolved): ToolLayoutProps {
  const c = r.copy;
  return {
    lang,
    tool: r.tool,
    path: r.path,
    title: c.title,
    description: c.description,
    h1: c.h1,
    intro: c.intro,
    steps: c.steps,
    faq: c.faq,
    ...(r.noindex ? { noindex: true } : {}),
  };
}

export function toolPageMetadata(lang: Lang, slug: string): Metadata {
  const r = resolve(lang, slug);
  if (!r) return {};
  return toolMetadata(layoutProps(lang, r));
}

export function ToolPage({ lang, slug }: { lang: Lang; slug: string }) {
  const r = resolve(lang, slug);
  if (!r) return null;
  return (
    <ToolLayout {...layoutProps(lang, r)} content={<ToolContent lang={lang} sections={r.copy.sections} />}>
      {r.island}
    </ToolLayout>
  );
}
