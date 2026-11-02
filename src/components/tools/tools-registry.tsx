/**
 * Dispatch table for /tools/[slug] and /hi/tools/[slug]: maps a slug to its widget, page copy
 * (src/content/tools via getToolCopy) and layout. SERVER-ONLY. Widgets are 'use client'.
 */
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import type { Lang } from '@/i18n/config';
import { NOINDEX_TOOL_SLUGS } from '@/config/tools';
import { allToolPageSlugs, parseToolSlug, toolPagePath } from '@/lib/tool-pages';
import {
  declarationExams,
  getToolCopy,
  hindiToolSlugs,
  nameDateExams,
  sizeOptions,
  type ToolCopy,
} from '@/server/content';
import ToolLayout, { toolMetadata, type ToolLayoutProps } from '@/components/layouts/ToolLayout';
import ToolContent from '@/components/tools/ToolContent';
import { toolDict } from '@/components/tools/dict';
import { sizePreset } from '@/components/tools/size-presets';
import ToolBatch from '@/components/tools/widgets/ToolBatch';
import ToolCompress from '@/components/tools/widgets/ToolCompress';
import ToolCompressPdf from '@/components/tools/widgets/ToolCompressPdf';
import ToolConvert from '@/components/tools/widgets/ToolConvert';
import ToolCustomPreset from '@/components/tools/widgets/ToolCustomPreset';
import ToolDeclaration from '@/components/tools/widgets/ToolDeclaration';
import ToolImagesToPdf from '@/components/tools/widgets/ToolImagesToPdf';
import ToolIncrease from '@/components/tools/widgets/ToolIncrease';
import ToolNameDate from '@/components/tools/widgets/ToolNameDate';
import ToolPhotoSheet from '@/components/tools/widgets/ToolPhotoSheet';
import ToolResize from '@/components/tools/widgets/ToolResize';
import ToolSignature from '@/components/tools/widgets/ToolSignature';
import ToolThumb from '@/components/tools/widgets/ToolThumb';

interface Resolved {
  tool: ToolLayoutProps['tool'];
  /** English path, e.g. "/tools/compress-image-to-20kb". */
  path: string;
  copy: ToolCopy;
  widget: ReactNode;
  noindex: boolean;
}

/** Every slug (path segment after /tools/) served for a language. */
export function toolSlugs(lang: Lang): string[] {
  return lang === 'hi' ? hindiToolSlugs() : allToolPageSlugs();
}

function widgetFor(lang: Lang, slug: string): ReactNode | null {
  const page = parseToolSlug(slug);
  if (!page) return null;
  const dict = toolDict(lang);
  switch (page.kind) {
    case 'compress-kb':
      return <ToolCompress lang={lang} dict={dict} initialKB={page.kb} />;
    case 'compress-range':
      return (
        <ToolCompress lang={lang} dict={dict} initialKB={page.maxKb} initialMinKB={page.minKb} />
      );
    case 'mb-to-kb':
      return <ToolCompress lang={lang} dict={dict} initialKB={100} />;
    case 'compress-pdf-kb':
      return <ToolCompressPdf lang={lang} dict={dict} initialKB={page.kb} />;
    case 'jpg-pdf-kb':
      return <ToolImagesToPdf lang={lang} dict={dict} initialKB={page.kb} />;
    case 'size': {
      const p = sizePreset(page.slug, lang);
      return (
        <ToolResize
          lang={lang}
          dict={dict}
          initial={p.initial}
          sizes={p.sizes}
          sizesLabel={p.sizesLabel}
        />
      );
    }
    case 'base':
      break;
  }
  switch (page.slug) {
    case 'compress-image':
      return <ToolCompress lang={lang} dict={dict} initialKB={50} askSize />;
    case 'compress-pdf':
      return <ToolCompressPdf lang={lang} dict={dict} />;
    case 'images-to-pdf':
      return <ToolImagesToPdf lang={lang} dict={dict} />;
    case 'resize-image':
      return <ToolResize lang={lang} dict={dict} />;
    case 'convert-image':
      return <ToolConvert lang={lang} dict={dict} />;
    case 'increase-image-size-in-kb':
      return <ToolIncrease lang={lang} dict={dict} initialMinKB={20} />;
    case 'batch-compress':
      return <ToolBatch lang={lang} dict={dict} />;
    case 'custom-preset':
      return <ToolCustomPreset lang={lang} dict={dict} />;
    case 'passport-photo-sheet':
      return <ToolPhotoSheet lang={lang} dict={dict} />;
    case 'signature-resize':
      return <ToolSignature lang={lang} dict={dict} options={sizeOptions('signature', lang)} />;
    case 'thumb-impression':
      return <ToolThumb lang={lang} dict={dict} options={sizeOptions('thumb', lang)} />;
    case 'handwritten-declaration': {
      const exams = declarationExams(lang).map(({ slug: s, name, text, toVerify }) => ({
        slug: s,
        name,
        text,
        toVerify,
      }));
      return (
        <ToolDeclaration
          lang={lang}
          dict={dict}
          exams={exams}
          options={sizeOptions('declaration', lang)}
        />
      );
    }
    case 'name-date-on-photo':
      return (
        <ToolNameDate lang={lang} dict={dict} options={nameDateExams(lang).map((e) => e.option)} />
      );
    default:
      return null;
  }
}

function resolve(lang: Lang, slug: string): Resolved | null {
  const page = parseToolSlug(slug);
  const copy = getToolCopy(slug, lang);
  const widget = widgetFor(lang, slug);
  if (!page || !copy || !widget) return null;
  return {
    tool: page.tool,
    path: toolPagePath(slug),
    copy,
    widget,
    noindex: NOINDEX_TOOL_SLUGS.includes(slug),
  };
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
    <ToolLayout
      {...layoutProps(lang, r)}
      content={<ToolContent lang={lang} sections={r.copy.sections} />}
    >
      {r.widget}
    </ToolLayout>
  );
}
