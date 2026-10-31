import Icon from './Icon';
import HowSearch from './how/HowSearch';
import HowCrop from './how/HowCrop';
import HowDownload from './how/HowDownload';
import { t } from '@/i18n';
import type { Lang } from '@/config/site';

const steps = [
  { icon: 'search', n: 1, Art: HowSearch },
  { icon: 'crop', n: 2, Art: HowCrop },
  { icon: 'download', n: 3, Art: HowDownload },
] as const;

export default function HowItWorks({ lang }: { lang: Lang }) {
  return (
    <section aria-labelledby="how-h" className="mt-12">
      <h2 id="how-h" className="text-xl font-bold">
        {t(lang, 'site.home.howTitle')}
      </h2>
      <ol className="mt-4 grid gap-3 sm:grid-cols-3">
        {steps.map(({ icon, n, Art }) => (
          <li key={n} className="card flex flex-col gap-4 p-4">
            {/* Fixed-height scene box: no layout shift, inline SVG, no JS. */}
            <div className="h-[120px] overflow-hidden rounded-2xl border border-rule bg-paper p-1 lg:h-[136px]">
              <Art title={t(lang, `site.how.step${n}Alt`)} />
            </div>
            <div className="flex gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary">
                <Icon name={icon} size={20} />
              </span>
              <span>
                <span className="block font-semibold">
                  {n}. {t(lang, `site.home.how${n}Title`)}
                </span>
                <span className="block text-sm text-muted">{t(lang, `site.home.how${n}Text`)}</span>
              </span>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
