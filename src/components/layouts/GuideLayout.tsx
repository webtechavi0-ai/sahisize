/** Guide article layout (SPEC 9.5) with Article + BreadcrumbList JSON-LD. */
import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import MainLayout from '@/components/layout/MainLayout';
import Breadcrumbs from '@/components/site/Breadcrumbs';
import PromoSlot from '@/components/site/PromoSlot';
import { t, localizePath } from '@/i18n';
import type { Lang } from '@/config/site';
import { getPreset } from '@/content/presets';
import { TOOLS } from '@/config/tools';
import { article, breadcrumbList } from '@/seo/jsonld';
import { localHref } from '@/seo/localize-href';
import { ogPathFor } from '@/seo/og-image';
import { formatDate } from '@/seo/spec-text';
import { toolNameKey } from '@/components/site/util';
import { buildMetadata } from '@/seo/metadata';

export interface GuideLayoutProps {
  lang: Lang;
  title: string;
  /** Full <title> text (frontmatter `seoTitle`); defaults to "<title> | SahiSize". */
  seoTitle?: string;
  description: string;
  slug: string;
  publishedAt: Date;
  updatedAt?: Date;
  relatedExams: string[];
  relatedTools: string[];
  /** Whether the other-language version exists. */
  hasCounterpart: boolean;
  children?: ReactNode;
}

function compute(p: Pick<GuideLayoutProps, 'lang' | 'slug' | 'hasCounterpart'>) {
  const { lang, slug, hasCounterpart } = p;
  const enPath = `/guides/${slug}`;
  const path = localizePath(enPath, lang);
  const toggleEn = lang === 'hi' ? (hasCounterpart ? enPath : '/guides') : enPath;
  // A Hindi guide without an English twin still needs a valid toggle target, but no hreflang.
  const hreflangAlt = hasCounterpart ? { en: enPath, hi: `/hi${enPath}` } : { en: toggleEn, hi: null };
  const alternates = lang === 'hi' ? { ...hreflangAlt, en: toggleEn } : hreflangAlt;
  return { enPath, path, alternates };
}

export function guideMetadata(p: GuideLayoutProps): Metadata {
  const { enPath, path, alternates } = compute(p);
  return buildMetadata({
    title: p.seoTitle ?? `${p.title} | SahiSize`,
    description: p.description,
    lang: p.lang,
    canonicalPath: path,
    alternates,
    ogImage: ogPathFor(enPath),
    ogType: 'article',
  });
}

export default function GuideLayout(props: GuideLayoutProps) {
  const { lang, title, description, publishedAt, updatedAt, relatedExams, relatedTools, children } = props;
  const tr = (k: string, v?: Record<string, string | number>) => t(lang, k, v);
  const { enPath, path, alternates } = compute(props);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const crumbs = [
    { name: tr('site.breadcrumb.home'), path: localHref('/', lang) },
    { name: tr('site.breadcrumb.guides'), path: localHref('/guides', lang) },
    { name: title, path },
  ];
  const exams = relatedExams
    .map((s) => getPreset(s))
    .filter((p) => p && p.published)
    .map((p) => ({ name: p!.name[lang], href: localHref(`/exam/${p!.slug}`, lang) }));
  const tools = TOOLS.filter((x) => relatedTools.includes(x.slug));

  return (
    <MainLayout
      lang={lang}
      alternates={alternates}
      jsonLd={[
        breadcrumbList(crumbs),
        article({ title, description, path, publishedAt, updatedAt, lang, image: ogPathFor(enPath) }),
      ]}
    >
      <Breadcrumbs lang={lang} crumbs={crumbs} />
      <article className="max-w-3xl">
        <header>
          <h1 className="text-3xl font-bold leading-tight">{title}</h1>
          <p className="mt-2 text-sm text-muted">
            <time dateTime={iso(updatedAt ?? publishedAt)}>
              {updatedAt
                ? tr('site.guides.updated', { date: formatDate(iso(updatedAt), lang) })
                : tr('site.guides.published', { date: formatDate(iso(publishedAt), lang) })}
            </time>
          </p>
        </header>
        <div className="prose prose-lg mt-6 max-w-none dark:prose-invert prose-a:text-primary">{children}</div>
      </article>
      {(exams.length > 0 || tools.length > 0) && (
        <aside className="mt-10 grid gap-6 sm:grid-cols-2">
          {exams.length > 0 && (
            <section>
              <h2 className="text-lg font-bold">{tr('site.guides.relatedExams')}</h2>
              <ul className="mt-2 space-y-1">
                {exams.map((e) => (
                  <li key={e.href}>
                    <a className="inline-flex min-h-[48px] items-center" href={e.href}>
                      {e.name}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {tools.length > 0 && (
            <section>
              <h2 className="text-lg font-bold">{tr('site.guides.relatedTools')}</h2>
              <ul className="mt-2 space-y-1">
                {tools.map((x) => (
                  <li key={x.slug}>
                    <a className="inline-flex min-h-[48px] items-center" href={localHref(x.path, lang)}>
                      {tr(toolNameKey(x.slug))}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      )}
      <PromoSlot lang={lang} placement="guide" />
    </MainLayout>
  );
}
