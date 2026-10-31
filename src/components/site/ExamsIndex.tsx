/**
 * /exams and /hi/exams (SPEC 4): all published exams grouped by body group, with search and filter.
 * Page metadata (title/description/og) comes from the route's generateMetadata.
 */
import MainLayout from '@/components/layout/MainLayout';
import Breadcrumbs from './Breadcrumbs';
import ExamCard from './ExamCard';
import ExamsFilterBoot from './ExamsFilterBoot';
import { t, localizePath } from '@/i18n';
import type { Lang } from '@/config/site';
import { getPublishedPresets } from '@/content/presets';
import { staticAlternates } from '@/seo/hreflang';
import { localHref } from '@/seo/localize-href';
import { breadcrumbList } from '@/seo/jsonld';
import { GROUP_ORDER, groupKey } from './util';
import { familyMembers, hubFamilies, hubPath } from '@/seo/families';

interface Props {
  lang: Lang;
}

export default function ExamsIndex({ lang }: Props) {
  const tr = (k: string, v?: Record<string, string | number>) => t(lang, k, v);
  const all = getPublishedPresets();
  const groups = GROUP_ORDER.map((g) => ({
    g,
    exams: all.filter((p) => p.group === g).sort((a, b) => a.name.en.localeCompare(b.name.en)),
  })).filter((x) => x.exams.length > 0);
  const hubs = hubFamilies().map((f) => ({ f, count: familyMembers(f).length }));
  const examHref = (s: string) => localHref(`/exam/${s}`, lang);
  const customHref = localHref('/tools/custom-preset', lang);
  const crumbs = [
    { name: tr('site.breadcrumb.home'), path: localizePath('/', lang) },
    { name: tr('site.breadcrumb.exams'), path: localizePath('/exams', lang) },
  ];
  return (
    <MainLayout lang={lang} alternates={staticAlternates('/exams')} jsonLd={[breadcrumbList(crumbs)]}>
      <Breadcrumbs lang={lang} crumbs={crumbs} />
      <h1 className="text-3xl font-bold">{tr('site.exams.h1')}</h1>
      <p className="mt-2 text-muted">{tr('site.exams.intro', { count: all.length })}</p>

      <nav aria-labelledby="fam-h" className="mt-5">
        <h2 id="fam-h" className="text-lg font-bold">{tr('site.hub.familiesTitle')}</h2>
        <ul className="mt-2 flex flex-wrap gap-2">
          {hubs.map(({ f, count }) => (
            <li key={hubPath(f)}>
              <a
                href={hubPath(f)}
                className="inline-flex min-h-tap items-center rounded-card border border-border-strong bg-surface px-4 font-semibold no-underline hover:border-primary"
              >
                {tr('site.hub.familyCard', { family: f.name, count })}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-6 space-y-3" data-exam-filter>
        <form role="search" action={localizePath('/exams', lang)} method="get" className="flex gap-2">
          <label htmlFor="exams-q" className="sr-only">{tr('site.exams.searchLabel')}</label>
          <input
            id="exams-q"
            name="q"
            type="search"
            autoComplete="off"
            enterKeyHint="search"
            placeholder={tr('site.header.searchPlaceholder')}
            className="h-tap min-w-0 flex-1 rounded-card border border-border-strong bg-surface px-3 text-text placeholder:text-muted"
          />
          <button type="submit" className="btn-action">{tr('site.header.searchSubmit')}</button>
        </form>
        <div
          role="group"
          aria-label={tr('site.exams.filterLabel')}
          className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 [scrollbar-width:thin] sm:flex-wrap sm:overflow-visible"
        >
          <button type="button" data-group-chip="" aria-pressed="true" className="chip">
            {tr('site.exams.all')} <span className="chip-n">{all.length}</span>
          </button>
          {groups.map(({ g, exams }) => (
            <button key={g} type="button" data-group-chip={g} aria-pressed="false" className="chip">
              {tr(groupKey(g))} <span className="chip-n">{exams.length}</span>
            </button>
          ))}
        </div>
        <p data-exam-count className="sr-only" aria-live="polite"></p>
      </div>

      <p data-no-results hidden className="card mt-6 p-4">{tr('site.exams.noResults')}</p>

      {groups.map(({ g, exams }) => (
        <section key={g} aria-labelledby={`g-${g}`} className="mt-8" data-group-section={g}>
          <h2 id={`g-${g}`} className="text-xl font-bold">
            {tr(groupKey(g))}
          </h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {exams.map((p) => (
              <ExamCard key={p.slug} lang={lang} preset={p} href={examHref(p.slug)} filterable />
            ))}
          </ul>
        </section>
      ))}

      <aside className="card mt-10 p-4 sm:p-5" aria-labelledby="cant-find-h" data-cant-find>
        <h2 id="cant-find-h" className="text-lg font-bold text-ink">{tr('ui.search.cantFind')}</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          <li>
            <a href={customHref} className="flex min-h-[56px] flex-col justify-center rounded-xl border border-rule-strong bg-card px-4 py-2 no-underline hover:border-ink">
              <span className="font-semibold text-ink">{tr('ui.search.useCustom')}</span>
              <span className="text-sm text-muted">{tr('ui.search.useCustomDesc')}</span>
            </a>
          </li>
          <li>
            <a href="/report" hrefLang={lang === 'hi' ? 'en-IN' : undefined} className="flex min-h-[56px] flex-col justify-center rounded-xl border border-rule-strong bg-card px-4 py-2 no-underline hover:border-ink">
              <span className="font-semibold text-ink">{tr('ui.search.tellUs')}</span>
              <span className="text-sm text-muted">{tr('ui.search.tellUsDesc')}</span>
            </a>
          </li>
        </ul>
      </aside>
      <ExamsFilterBoot />
    </MainLayout>
  );
}
