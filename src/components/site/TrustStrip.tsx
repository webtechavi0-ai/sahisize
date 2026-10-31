/** "On-device · Free · Official specs · Works offline" (SPEC 6.2 #5). */
import Icon from './Icon';
import { t } from '@/i18n';
import type { Lang } from '@/config/site';

const items = [
  { icon: 'shield', k: 'onDevice' },
  { icon: 'gift', k: 'free' },
  { icon: 'badge', k: 'official' },
  { icon: 'wifiOff', k: 'offline' },
] as const;

export default function TrustStrip({ lang }: { lang: Lang }) {
  return (
    <section aria-label={t(lang, 'site.trust.label')} className="mt-12">
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {items.map((i) => (
          <li key={i.k} className="card flex items-start gap-2 p-3">
            <Icon name={i.icon} size={22} className="mt-0.5 shrink-0 text-success" />
            <span>
              <span className="block font-semibold">{t(lang, `site.trust.${i.k}`)}</span>
              <span className="block text-sm text-muted">{t(lang, `site.trust.${i.k}Text`)}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
