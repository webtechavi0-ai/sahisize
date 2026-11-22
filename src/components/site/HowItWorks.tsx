import type { ReactNode } from 'react';
import Icon from './Icon';
import HowSearch from './how/HowSearch';
import HowCrop from './how/HowCrop';
import HowDownload from './how/HowDownload';
import { t } from '@/i18n/server';
import { type Lang } from '@/i18n/config';

const steps = [
  { icon: 'search', n: 1, Art: HowSearch },
  { icon: 'crop', n: 2, Art: HowCrop },
  { icon: 'download', n: 3, Art: HowDownload },
] as const;

/**
 * Home "How it works" band. Phones: the (lazy) home illustration, then three compact rows.
 * From 640 px: three columns with the step scenes.
 */
export default function HowItWorks({ lang, art }: { lang: Lang; art?: ReactNode }) {
  return (
    <section aria-labelledby="how-h" className="band py-8 sm:py-14 lg:py-20">
      <div className="w-full">
        <h2 id="how-h" className="text-h2">
          {t(lang, 'site.home.howTitle')}
        </h2>
        <div className="mt-4 sm:mt-6">
          {art}
          <ol className="grid gap-2 sm:grid-cols-3 sm:gap-4">
            {steps.map(({ icon, n, Art }) => (
              <li key={n} className="card flex flex-col gap-4 p-3 shadow-e1 sm:p-5">
                {/* Fixed-height scene box: no layout shift, inline SVG, no JS. */}
                <div className="hidden h-[120px] overflow-hidden rounded-xl bg-paper p-1 ring-1 ring-rule sm:block lg:h-[136px]">
                  <Art title={t(lang, `site.how.step${n}Alt`)} />
                </div>
                <div className="flex gap-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-on-ink">
                    <Icon name={icon} size={20} />
                  </span>
                  <span>
                    <span className="block text-h3 text-heading">
                      {n}. {t(lang, `site.home.how${n}Title`)}
                    </span>
                    <span className="block text-sm text-muted">{t(lang, `site.home.how${n}Text`)}</span>
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
