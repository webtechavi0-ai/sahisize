import RootShell from '@/components/layout/RootShell';
import MainLayout from '@/components/layout/MainLayout';
import HeroSearch from '@/components/site/HeroSearch';
import ExamCard from '@/components/site/ExamCard';
import { buildMetadata } from '@/seo/metadata';
import { t } from '@/i18n';
import { getSeasonOrder } from '@/content/presets';
import { pickPopular } from '@/content/presets/verified';

/** Helpful 404 with exam search (SPEC 4). Exported as 404.html. */
const lang = 'en' as const;
const tr = (k: string) => t(lang, k);

export const metadata = buildMetadata({
  title: tr('site.notFound.title'),
  description: tr('site.notFound.text'),
  canonicalPath: '/404',
  // No `noindex` here: Next.js already emits <meta name="robots" content="noindex"> on the
  // not-found page, and a second robots tag would duplicate it.
});

export default function GlobalNotFound() {
  const quick = [
    { href: '/exams', label: tr('site.footer.allExams') },
    { href: '/tools', label: tr('ui.search.allTools') },
    { href: '/id-documents', label: tr('ui.search.cat.govtId') },
    { href: '/tools/custom-preset', label: tr('ui.search.useCustom') },
    { href: '/report', label: tr('ui.search.tellUs') },
  ];
  const popular = pickPopular(getSeasonOrder(), { year: new Date().getFullYear(), limit: 6 });
  return (
    <RootShell lang={lang}>
      <MainLayout lang={lang} hideSearch>
        <h1 className="text-3xl font-bold">{tr('site.notFound.h1')}</h1>
        <p className="mt-2 text-muted">{tr('site.notFound.text')}</p>
        <div className="mt-5 max-w-xl">
          <HeroSearch lang={lang} />
        </div>
        <nav aria-label={t(lang, 'site.header.nav')} className="mt-5">
          <ul className="flex flex-wrap gap-2">
            {quick.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  className="inline-flex min-h-tap items-center rounded-full border border-rule-strong bg-card px-4 font-semibold text-ink no-underline hover:border-ink"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {popular.map((p) => (
            <ExamCard key={p.slug} lang={lang} preset={p} href={`/exam/${p.slug}`} />
          ))}
        </ul>
        <p className="mt-6">
          <a href="/" className="font-semibold">
            {tr('site.notFound.home')}
          </a>
        </p>
      </MainLayout>
    </RootShell>
  );
}
