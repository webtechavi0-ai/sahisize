/** "On-device · Free · Official specs · Works offline" (SPEC 6.2 #5): one compact card. */
import Icon from './Icon';
import { t } from '@/i18n/server';
import { type Lang } from '@/i18n/config';

const items = [
  { icon: 'shield', k: 'onDevice' },
  { icon: 'gift', k: 'free' },
  { icon: 'badge', k: 'official' },
  { icon: 'wifiOff', k: 'offline' },
] as const;

export default function TrustStrip({ lang, className = '' }: { lang: Lang; className?: string }) {
  return (
    <section aria-label={t(lang, 'site.trust.label')} className={className}>
      <ul className="card grid divide-y divide-rule shadow-e1 sm:grid-cols-2 sm:divide-y-0 md:grid-cols-4 md:divide-x">
        {items.map((i) => (
          <li key={i.k} className="flex items-center gap-3 px-4 py-2.5 sm:py-4">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-chalk-soft text-chalk" aria-hidden="true">
              <Icon name={i.icon} size={20} />
            </span>
            <span className="min-w-0">
              <span className="block font-semibold leading-snug text-heading">{t(lang, `site.trust.${i.k}`)}</span>
              <span className="block text-sm leading-snug text-muted">{t(lang, `site.trust.${i.k}Text`)}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
