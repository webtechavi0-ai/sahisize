/**
 * /sources (SPEC 5.3): every published preset with its source, page and last-checked date,
 * grouped into verified (official notice, see isVerifiedPreset) and unverified (secondary sources).
 */
import MainLayout from '@/components/layout/MainLayout';
import Breadcrumbs from '@/components/site/Breadcrumbs';
import { t } from '@/i18n';
import { getPreset, getSources, type SourceEntry } from '@/content/presets';
import { isVerifiedPreset } from '@/content/presets/verified';
import { breadcrumbList } from '@/seo/jsonld';
import { formatDate } from '@/seo/spec-text';
import { buildMetadata } from '@/seo/metadata';

const lang = 'en' as const;
const tr = (k: string, v?: Record<string, string | number>) => t(lang, k, v);

export const metadata = buildMetadata({
  title: tr('site.sources.title'),
  description: tr('site.sources.description'),
  canonicalPath: '/sources',
  alternates: { en: '/sources', hi: null },
});

export default function Page() {
  const all = getSources();
  const isVerified = (r: SourceEntry) => {
    const p = getPreset(r.slug);
    return p ? isVerifiedPreset(p) : false;
  };
  // The confidence column only makes sense for official sources: an unverified row's
  // "Official notice" confidence would contradict its group, so that table omits it.
  const groups = [
    { id: 'verified', rows: all.filter(isVerified), h2: 'site.sources.verifiedH2', text: 'site.sources.verifiedText' },
    { id: 'unverified', rows: all.filter((r) => !isVerified(r)), h2: 'site.sources.unverifiedH2', text: 'site.sources.unverifiedText' },
  ].filter((g) => g.rows.length > 0);
  const conf: Record<string, string> = {
    H: tr('site.sources.confidenceH'),
    M: tr('site.sources.confidenceM'),
    'H/M': tr('site.sources.confidenceHM'),
    'M/L': tr('site.sources.confidenceML'),
    L: tr('site.sources.confidenceML'),
  };
  const crumbs = [
    { name: tr('site.breadcrumb.home'), path: '/' },
    { name: tr('site.sources.h1'), path: '/sources' },
  ];
  return (
    <MainLayout alternates={{ en: '/sources', hi: null }} jsonLd={[breadcrumbList(crumbs)]}>
      <Breadcrumbs lang={lang} crumbs={crumbs} />
      <h1 className="text-3xl font-bold">{tr('site.sources.h1')}</h1>
      <p className="mt-2 max-w-3xl text-muted">
        {tr('site.sources.intro')} <a href="/report" className="underline">{tr('site.footer.report')}</a>
      </p>
      <p className="mt-2 max-w-3xl text-muted">
        <a href="/editorial-policy" className="underline">{tr('site.footer.editorialPolicy')}</a>
      </p>
      {groups.map((g) => (
        <section key={g.id} className="mt-8" aria-labelledby={`${g.id}-h`} data-source-group={g.id}>
          <h2 id={`${g.id}-h`} className="text-xl font-bold">{tr(g.h2, { count: g.rows.length })}</h2>
          <p className="mt-1 max-w-3xl text-muted">{tr(g.text)}</p>
          <div className="mt-3 overflow-x-auto rounded-card border border-border bg-surface">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-bg text-muted">
                <tr>
                  <th scope="col" className="px-3 py-2">{tr('site.sources.colExam')}</th>
                  <th scope="col" className="px-3 py-2">{tr('site.sources.colNotification')}</th>
                  <th scope="col" className="px-3 py-2">{tr('site.sources.colSource')}</th>
                  <th scope="col" className="px-3 py-2">{tr('site.sources.colChecked')}</th>
                  {g.id === 'verified' && <th scope="col" className="px-3 py-2">{tr('site.sources.colConfidence')}</th>}
                </tr>
              </thead>
              <tbody>
                {g.rows.map((r) => (
                  <tr key={r.slug} className="border-t border-border align-top">
                    <th scope="row" className="px-3 py-3 font-semibold">
                      <a href={`/exam/${r.slug}`} className="inline-flex min-h-[48px] items-center">{r.name.en}</a>
                      <span className="block text-xs font-normal text-muted">{r.body} · {r.cycle}</span>
                    </th>
                    <td className="px-3 py-3">{r.notification}</td>
                    <td className="px-3 py-3">
                      <a href={r.sourceUrl} rel="noopener nofollow external" target="_blank" className="inline-flex min-h-[48px] items-center break-all">
                        {new URL(r.sourceUrl).hostname}
                      </a>
                      {r.sourcePage && <span className="text-muted"> · {tr('site.exam.sourcePage', { page: r.sourcePage })}</span>}
                      {r.extraSources.map((s) => (
                        <a key={s.url} href={s.url} rel="noopener nofollow external" target="_blank" className="flex min-h-[48px] items-center">
                          {s.label}
                        </a>
                      ))}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <time dateTime={r.lastChecked}>{formatDate(r.lastChecked)}</time>
                    </td>
                    {g.id === 'verified' && <td className="px-3 py-3">{conf[r.confidence]}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </MainLayout>
  );
}
