/**
 * FAQ side illustration (home): an upload field rejected at 86 KB (limit 20–50 KB), a saffron
 * arrow, then the same field passing at 23 KB with a chalk PASS stamp. Inline SVG, colours only
 * via token classes (follows dark mode), no SSR style attributes (CSP, QUESTIONS Q28/Q29).
 * Bar scale: 0–100 KB over x 93–253 (1.6 px per KB), so the limit box spans x 125–173.
 */
import { t } from '@/i18n';
import type { Lang } from '@/config/site';

interface Props {
  lang: Lang;
  className?: string;
}

const id = 'faq-art-title';

export default function FaqIllustration({ lang, className: cls = '' }: Props) {
  return (
    <figure className={`card m-0 rounded-2xl p-4 ${cls}`}>
      <svg
        role="img"
        aria-labelledby={id}
        viewBox="0 0 320 264"
        className="block aspect-[320/264] h-auto w-full"
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fontFamily="inherit"
      >
        <title id={id}>{t(lang, 'site.home.faqArtAlt')}</title>
        {/* rejected */}
        <rect x="13" y="13" width="294" height="96" rx="14" className="fill-paper stroke-danger" />
        <rect x="27" y="27" width="50" height="68" rx="12" className="fill-rule" />
        <circle cx="52" cy="52" r="10" className="fill-muted" />
        <path d="M37 94c1-12 7-19 15-19s14 7 15 19z" className="fill-muted" />
        <rect x="27" y="27" width="50" height="68" rx="12" className="stroke-ink" />
        <text x="93" y="47" fontSize="20" fontWeight="700" className="fill-danger-text">86 KB</text>
        <rect x="93" y="62" width="160" height="10" rx="5" className="fill-rule" />
        <rect x="93" y="62" width="138" height="10" rx="5" className="fill-danger" />
        <rect x="125" y="56" width="48" height="22" rx="6" strokeDasharray="4 4" className="stroke-danger" />
        <text x="149" y="96" fontSize="12" fontWeight="600" textAnchor="middle" className="fill-danger-text">20–50 KB</text>
        <circle cx="279" cy="52" r="13" className="fill-danger" />
        <path d="M274 47l10 10M284 47l-10 10" className="stroke-card" />
        {/* arrow */}
        <path d="M155 118h10v13h8l-13 14-13-14h8z" className="fill-saffron stroke-saffron" />
        {/* accepted */}
        <rect x="13" y="155" width="294" height="96" rx="14" className="fill-paper stroke-ink" />
        <rect x="27" y="169" width="50" height="68" rx="12" className="fill-rule" />
        <circle cx="52" cy="194" r="10" className="fill-muted" />
        <path d="M37 236c1-12 7-19 15-19s14 7 15 19z" className="fill-muted" />
        <rect x="27" y="169" width="50" height="68" rx="12" className="stroke-ink" />
        <text x="93" y="189" fontSize="20" fontWeight="700" className="fill-chalk-text">23 KB</text>
        <rect x="93" y="204" width="160" height="10" rx="5" className="fill-rule" />
        <rect x="93" y="204" width="37" height="10" rx="5" className="fill-chalk" />
        <rect x="125" y="198" width="48" height="22" rx="6" className="stroke-chalk" />
        <text x="149" y="238" fontSize="12" fontWeight="600" textAnchor="middle" className="fill-muted">20–50 KB</text>
        <g transform="rotate(-10 279 194)" className="stroke-chalk">
          <rect x="259" y="176" width="40" height="36" rx="9" className="fill-chalk-soft" />
          <rect x="263" y="180" width="32" height="28" rx="6" />
          <path d="M270 194l6 6 10-11" />
        </g>
      </svg>
    </figure>
  );
}
