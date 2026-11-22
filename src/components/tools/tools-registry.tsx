/**
 * Dispatch table for /tools/[slug] and /hi/tools/[slug]: maps a slug to its widget, page copy
 * (src/content/tools via getToolCopy) and layout. SERVER-ONLY. Widgets are 'use client'.
 */
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import type { Lang } from '@/i18n/config';
import { COMPRESS_KB_TARGETS, JPG_PDF_KB_TARGETS, NOINDEX_TOOL_SLUGS, PDF_KB_TARGETS } from '@/config/tools';
import { t } from '@/i18n/server';
import { toolNameKey } from '@/components/site/util';
import type { ChipLink } from '@/components/rail/blocks';
import { allToolPageSlugs, parseToolSlug, toolPagePath } from '@/lib/tool-pages';
import {
  declarationExams,
  getToolCopy,
  hindiToolSlugs,
  kbLimitExamLinks,
  localHref,
  nameDateExams,
  sizeOptions,
  toolGuideLinks,
  type ToolCopy,
  type ToolExamLinks,
  type ToolLink,
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
import ToolKbConvert from '@/components/tools/widgets/ToolKbConvert';
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
  /** undefined: the layout's default "Exams that use this"; null: none. */
  examLinks: ToolExamLinks | null | undefined;
  guides: ToolLink[];
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
    case 'photo-size-converter-in-kb':
      return <ToolKbConvert lang={lang} dict={dict} initialKB={50} />;
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

/**
 * KB pages list only exams whose limit suits that size, linked to the document page. Photo KB
 * and range pages already list their exams in the copy (sections), so the layout adds none.
 */
function examLinksFor(lang: Lang, slug: string): ToolExamLinks | null | undefined {
  const page = parseToolSlug(slug);
  switch (page?.kind) {
    case 'compress-pdf-kb':
    case 'jpg-pdf-kb':
      return kbLimitExamLinks(page.kb, true, lang);
    case 'compress-kb':
    case 'compress-range':
      return null;
    default:
      return undefined;
  }
}

/** Related guides not already linked from the page copy. */
function guidesFor(lang: Lang, slug: string, copy: ToolCopy): ToolLink[] {
  const linked = new Set(copy.sections.flatMap((s) => (s.links ?? []).map((l) => l.href)));
  return toolGuideLinks(slug, lang).filter((g) => !linked.has(g.href));
}

const OTHER_TOOLS = [
  'photo-size-converter-in-kb',
  'signature-resize',
  'thumb-impression',
  'handwritten-declaration',
  'compress-pdf',
  'resize-image',
] as const;

/**
 * Side-rail chips for a tool page (inner-pages spec §6.2): the nearest other KB sizes on KB pages,
 * otherwise a fixed set of other tools. Only pages published in `lang`; never the page itself.
 */
export function relatedToolLinks(slug: string, lang: Lang): { title: string; links: ChipLink[] } | null {
  const page = parseToolSlug(slug);
  if (!page) return null;
  const served = new Set(toolSlugs(lang));
  const href = (s: string) => localHref(toolPagePath(s), lang);
  const nearest = (targets: readonly number[], self: number, toSlug: (n: number) => string, label: (n: number) => string) => {
    const picked = targets
      .filter((n) => n !== self && served.has(toSlug(n)))
      .sort((a, b) => Math.abs(Math.log(a / self)) - Math.abs(Math.log(b / self)) || a - b)
      .slice(0, 8)
      .sort((a, b) => a - b);
    return { title: t(lang, 'site.rail.otherSizes'), links: picked.map((n) => ({ href: href(toSlug(n)), label: label(n) })) };
  };
  const kbSlug = (n: number) => `compress-image-to-${n}kb`;
  switch (page.kind) {
    case 'compress-kb':
      return nearest(COMPRESS_KB_TARGETS, page.kb, kbSlug, (n) => `${n} KB`);
    case 'compress-range':
      return nearest(COMPRESS_KB_TARGETS, page.maxKb, kbSlug, (n) => `${n} KB`);
    case 'compress-pdf-kb':
      return nearest(PDF_KB_TARGETS, page.kb, (n) => `compress-pdf-to-${n}kb`, (n) => `${n} KB PDF`);
    case 'jpg-pdf-kb':
      return nearest(JPG_PDF_KB_TARGETS, page.kb, (n) => `jpg-to-pdf-under-${n}kb`, (n) => `${n} KB PDF`);
    default: {
      const links = OTHER_TOOLS.filter((s) => s !== slug && served.has(s)).map((s) => ({
        href: href(s),
        label: t(lang, toolNameKey(s)),
      }));
      return { title: t(lang, 'site.rail.otherTools'), links };
    }
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
    examLinks: examLinksFor(lang, slug),
    guides: guidesFor(lang, slug, copy),
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
      examLinks={r.examLinks}
      guides={r.guides}
      related={relatedToolLinks(slug, lang)}
      content={<ToolContent lang={lang} sections={r.copy.sections} />}
    >
      {r.widget}
    </ToolLayout>
  );
}
