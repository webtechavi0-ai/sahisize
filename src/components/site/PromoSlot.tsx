/**
 * Cross-promotion card (SPEC 10). Placed AFTER a tool, never inside upload, crop,
 * result or download areas. Clicks fire `promo_click` via delegated tracking in
 * src/scripts/analytics-init.ts (data-promo-* attributes).
 */
import Icon from './Icon';
import { t } from '@/i18n';
import type { Lang } from '@/config/site';
import { getPromo, type PromoPlacement } from '@/config/monetization';
import type { ExamGroup } from '@/content/presets/schema';

interface Props {
  lang: Lang;
  placement: PromoPlacement;
  exam?: string;
  group?: ExamGroup;
}

export default function PromoSlot({ lang, placement, exam, group }: Props) {
  const promo = getPromo({ placement, lang, exam, group });
  if (!promo) return null;
  return (
    <aside aria-label={t(lang, 'site.promo.label')} className="mt-10 rounded-card border border-border bg-surface p-4">
      <p className="text-xs uppercase tracking-wide text-muted">{t(lang, 'site.promo.label')}</p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 font-semibold">
          <Icon name="gift" className="shrink-0 text-primary" />
          <span>{promo.text}</span>
        </p>
        <a
          href={promo.href}
          rel="noopener sponsored"
          target="_blank"
          data-promo-slot="promo"
          data-promo-placement={placement}
          data-promo-exam={exam}
          data-promo-group={group}
          className="inline-flex min-h-tap items-center gap-1 rounded-card border border-primary px-4 font-semibold text-primary no-underline hover:bg-bg"
        >
          {promo.cta}
          <Icon name="external" size={16} />
        </a>
      </div>
    </aside>
  );
}
