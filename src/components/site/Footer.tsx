/**
 * Footer (SPEC 6.1, 11.2; redesign spec §8): brand block (promise + "not affiliated" pill),
 * then tools, top exams, guides and legal links as <details data-open-md> groups. Phones: the
 * groups start closed (≈440 px instead of ~1,950); from 768 px they show open (CSS, with a
 * HeaderClient fallback). Every link stays in the HTML.
 */
import type { ReactNode } from 'react';
import { CORE_PROMISE, ENTITY_NAME } from '@/config/site';
import Icon from './Icon';
import { TOOL_SLUGS, TOOL_META } from '@/config/tools';
import { toolNameKey } from './util';
import { type Lang } from '@/i18n/config';
import { listGuides, seasonOrder, localHref } from '@/server/content';
import { t } from '@/i18n/server';
import { pickPopular } from '@/lib/presets';
import { HINDI_KB_GUIDE, UPLOAD_GUIDE } from './guide-links';

interface Props {
  lang: Lang;
}

const legal = [
  ['/about', 'site.footer.about'],
  ['/privacy', 'site.footer.privacy'],
  ['/terms', 'site.footer.terms'],
  ['/disclaimer', 'site.footer.disclaimer'],
  ['/contact', 'site.footer.contact'],
  ['/sources', 'site.footer.sources'],
  ['/editorial-policy', 'site.footer.editorialPolicy'],
  ['/report', 'site.footer.report'],
] as const;
/** Guides listed first in the footer when they exist in the page's language (SEO plan E2). */
const PINNED_GUIDES: readonly string[] = [UPLOAD_GUIDE, HINDI_KB_GUIDE];
const FOOTER_GUIDES = 5;
const linkCls = 'inline-flex min-h-tap min-w-tap items-center text-[15px] text-text no-underline hover:text-ink hover:underline';

/** One footer group: a disclosure on phones, an always-open column from 768 px. */
function Group({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <details data-open-md className="group border-t border-rule md:border-0">
      <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden md:mb-1 md:min-h-0 md:cursor-default">
        <h2 id={id} className="text-[15px] font-bold text-heading">
          {title}
        </h2>
        <Icon name="chevronDown" size={20} className="shrink-0 text-muted transition-transform group-open:rotate-180 md:hidden" />
      </summary>
      <div className="pb-3 md:pb-0">{children}</div>
    </details>
  );
}

export default function Footer({ lang }: Props) {
  const tr = (k: string, v?: Record<string, string | number>) => t(lang, k, v);
  const href = (enPath: string) => localHref(enPath, lang);
  const topExams = pickPopular(seasonOrder(), { year: new Date().getFullYear(), limit: 8 });
  const footerTools = TOOL_SLUGS.filter((s) => s !== 'custom-preset' && s !== 'batch-compress').slice(0, 8);
  const published = listGuides(lang).filter((g) => !g.draft);
  const pinned = PINNED_GUIDES.flatMap((s) => published.filter((g) => g.slug === s));
  const guides = [
    ...pinned,
    ...published.filter((g) => !PINNED_GUIDES.includes(g.slug)).sort((a, b) => a.order - b.order),
  ].slice(0, FOOTER_GUIDES);

  return (
    <footer className="border-t border-rule bg-band">
      <div className="container-fluid grid gap-x-8 pt-6 md:grid-cols-4 md:gap-y-10 md:py-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
        <div className="pb-4 md:col-span-4 md:pb-0 lg:col-span-1">
          <a href={href('/')} className="inline-flex min-h-tap items-center gap-2 font-bold no-underline" lang="en">
            {/* eslint-disable-next-line @next/next/no-img-element -- static SVG logo, nothing to optimise */}
            <img src="/icon.svg" width="28" height="28" alt="" className="h-7 w-7" />
            <span className="text-lg tracking-tight">
              <span className="text-saffron-text">Sahi</span>
              <span className="text-heading">Size</span>
            </span>
          </a>
          <p className="mt-1 max-w-xs text-sm text-muted">{CORE_PROMISE[lang === 'hi' ? 'hi' : 'en']}</p>
          <p className="mt-3 inline-flex rounded-full bg-card px-3 py-1 text-xs font-semibold text-muted ring-1 ring-rule">
            {tr('site.footer.notAffiliated')}
          </p>
        </div>
        <Group id="ft-tools" title={tr('site.footer.tools')}>
          <ul aria-labelledby="ft-tools">
            {footerTools.map((slug) => (
              <li key={slug}><a className={linkCls} href={href(TOOL_META[slug].path)}>{tr(toolNameKey(slug))}</a></li>
            ))}
            <li><a className={linkCls} href={href('/id-documents')}>{tr('site.footer.idDocuments')}</a></li>
            <li><a className={`${linkCls} font-semibold text-ink`} href={href('/tools')}>{tr('ui.search.allTools')}</a></li>
          </ul>
        </Group>
        <Group id="ft-exams" title={tr('site.footer.topExams')}>
          <ul aria-labelledby="ft-exams">
            {topExams.map((p) => (
              <li key={p.slug}><a className={linkCls} href={href(`/exam/${p.slug}`)}>{p.name[lang]}</a></li>
            ))}
            <li><a className={`${linkCls} font-semibold text-ink`} href={href('/exams')}>{tr('site.footer.allExams')}</a></li>
          </ul>
        </Group>
        <Group id="ft-guides" title={tr('site.footer.guides')}>
          <ul aria-labelledby="ft-guides">
            {guides.map((g) => (
              <li key={g.slug}>
                {/* Same 48 px row as the other columns: one line, full title on hover. */}
                <a className={`${linkCls} max-w-full`} href={href(`/guides/${g.slug}`)} title={g.title}>
                  <span className="line-clamp-1 min-w-0">{g.title}</span>
                </a>
              </li>
            ))}
            <li><a className={`${linkCls} font-semibold text-ink`} href={href('/guides')}>{tr('site.footer.allGuides')}</a></li>
          </ul>
        </Group>
        <Group id="ft-legal" title={tr('site.footer.legal')}>
          <ul aria-labelledby="ft-legal" className="flex flex-wrap gap-x-4 md:block">
            {legal.map(([path, key]) => {
              const to = href(path);
              return (
                <li key={path}><a className={linkCls} href={to} hrefLang={lang === 'hi' && !to.startsWith('/hi') ? 'en-IN' : undefined}>{tr(key)}</a></li>
              );
            })}
          </ul>
        </Group>
      </div>
      <div className="container-fluid">
        <p className="border-t border-rule py-4 text-[13px] text-muted md:py-5">
          {tr('site.footer.copyright', { year: new Date().getFullYear(), entity: ENTITY_NAME })}
        </p>
      </div>
    </footer>
  );
}
