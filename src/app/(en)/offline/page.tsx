/** Service-worker navigate fallback (PLAN 3.15). Precached; noindex. */
import MainLayout from '@/components/layout/MainLayout';
import { t } from '@/i18n';
import { getSeasonOrder } from '@/content/presets';
import { TOOLS } from '@/config/tools';
import { toolNameKey } from '@/components/site/util';
import { buildMetadata } from '@/seo/metadata';
import ReloadLink from './ReloadLink';

const lang = 'en' as const;
const tr = (k: string) => t(lang, k);

export const metadata = buildMetadata({
  title: tr('site.offline.title'),
  description: tr('site.offline.text'),
  canonicalPath: '/offline',
  noindex: true,
});

export default function Page() {
  const kits = getSeasonOrder().slice(0, 8);
  return (
    <MainLayout>
      <h1 className="text-3xl font-bold">{tr('site.offline.h1')}</h1>
      <p className="mt-2 text-muted">{tr('site.offline.text')}</p>
      <p className="mt-4"><ReloadLink>{tr('site.offline.retry')}</ReloadLink></p>
      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <section>
          <h2 className="text-lg font-bold">{tr('site.header.tools')}</h2>
          <ul className="mt-2 space-y-1">
            {TOOLS.map((x) => <li key={x.slug}><a className="inline-flex min-h-[48px] items-center" href={x.path}>{tr(toolNameKey(x.slug))}</a></li>)}
          </ul>
        </section>
        <section>
          <h2 className="text-lg font-bold">{tr('site.header.exams')}</h2>
          <ul className="mt-2 space-y-1">
            {kits.map((p) => <li key={p.slug}><a className="inline-flex min-h-[48px] items-center" href={`/kit/${p.slug}`}>{p.name.en}</a></li>)}
          </ul>
        </section>
      </div>
    </MainLayout>
  );
}
