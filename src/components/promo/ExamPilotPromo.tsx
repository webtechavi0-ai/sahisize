/**
 * ExamPilot promotion (SPEC 10, src/config/monetization.ts EXAMPILOT). ExamPilot is a separate
 * product, so the block is always labelled "Sponsored" / "प्रायोजित".
 *
 * Variants:
 *  - card:   vertical, for the sticky right sidebar on >=1440px tool pages
 *  - inline: horizontal, under the result and download section (phones: after the tool)
 *  - banner: home page strip below the hero, dismissible (PromoDismiss island; the dismissal
 *            is applied before first paint by the root pre-paint script, so a dismissed banner never flashes)
 *
 * A plain outbound link: no script, no third-party request. The mock-up is a local SVG with
 * fixed width/height (no layout shift) and loading="lazy". Clicks are tracked by the
 * delegated listener in src/scripts/analytics-init.ts (data-promo-* attributes).
 */
import mockup from '@/assets/promo/exampilot-mockup.svg';
import Icon from '@/components/site/Icon';
import PromoDismiss from '@/islands/PromoDismiss';
import { EXAMPILOT, examPilotHref, type ExamPilotVariant } from '@/config/monetization';
import type { Lang } from '@/config/site';

interface Props {
  lang: Lang;
  variant: ExamPilotVariant;
  /** Page slug for utm_campaign and analytics, e.g. "compress-image" or "home". */
  page: string;
  className?: string;
}

const cta =
  'inline-flex min-h-tap items-center justify-center gap-2 rounded-xl bg-ink px-5 font-semibold text-on-ink no-underline shadow-btn transition duration-150 hover:-translate-y-px hover:bg-ink-hover hover:shadow-btn-hover motion-reduce:transition-none motion-reduce:hover:translate-y-0';

export default function ExamPilotPromo({ lang, variant, page, className: cls = '' }: Props) {
  if (!EXAMPILOT.enabled) return null;
  const c = EXAMPILOT.copy[lang];
  const href = examPilotHref(page);
  const placement = variant === 'card' ? 'sidebar' : variant;
  const linkAttrs = {
    href,
    target: '_blank',
    rel: 'sponsored noopener noreferrer',
    'data-promo-slot': 'promo',
    'data-promo-id': EXAMPILOT.id,
    'data-promo-placement': placement,
    'data-promo-page': page,
  };
  const label = `${c.label}: ${c.name}`;
  const img = (imgCls: string) => (
    <img
      src={mockup.src}
      width={mockup.width}
      height={mockup.height}
      alt={c.imageAlt}
      loading="lazy"
      decoding="async"
      className={imgCls}
    />
  );

  if (variant === 'card') {
    return (
      <aside aria-label={label} data-promo="exampilot" className={`card overflow-hidden shadow-sm ${cls}`}>
        {img('block h-auto w-full border-b border-rule bg-saffron-soft p-3')}
        <div className="space-y-2 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{c.label}</p>
          <p className="text-lg font-bold text-ink">{c.name}</p>
          <p className="text-sm">{c.pitch}</p>
          <a {...linkAttrs} className={`${cta} mt-2 w-full`}>
            {c.cta}
            <Icon name="external" size={16} />
          </a>
        </div>
      </aside>
    );
  }
  if (variant === 'inline') {
    return (
      <aside
        aria-label={label}
        data-promo="exampilot"
        className={`card flex flex-col gap-4 p-4 sm:flex-row sm:items-center ${cls}`}
      >
        {img('hidden h-auto w-44 shrink-0 rounded-xl bg-saffron-soft p-2 sm:block')}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{c.label}</p>
          <p className="mt-1 font-bold text-ink">{c.name}</p>
          <p className="mt-1 text-sm">{c.pitch}</p>
        </div>
        <a {...linkAttrs} className={`${cta} w-full shrink-0 sm:w-auto`}>
          {c.cta}
          <Icon name="external" size={16} />
        </a>
      </aside>
    );
  }
  if (variant === 'banner') {
    return (
      <aside
        aria-label={label}
        data-promo="exampilot"
        data-exampilot-banner
        className={`card relative flex items-center gap-4 border-l-4 border-l-saffron p-4 pr-16 sm:pr-16 ${cls}`}
      >
        {img('hidden h-auto w-36 shrink-0 rounded-lg bg-saffron-soft p-1.5 sm:block')}
        <div className="flex min-w-0 flex-1 flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{c.label}</p>
            <p className="mt-1">
              <span className="font-bold text-ink">{c.name}</span>
              <span className="text-sm"> · {c.pitch}</span>
            </p>
          </div>
          <a {...linkAttrs} className={`${cta} shrink-0 self-start md:self-auto`}>
            {c.cta}
            <Icon name="external" size={16} />
          </a>
        </div>
        <div className="absolute right-2 top-2">
          <PromoDismiss label={c.dismiss} storageKey={EXAMPILOT.dismissKey} />
        </div>
      </aside>
    );
  }
  return null;
}
