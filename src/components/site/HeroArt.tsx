import type { Lang } from '@/config/site';
import { t } from '@/i18n';

/**
 * Home hero illustration: a casual phone selfie becomes a formal passport-size photo with a
 * PASS stamp, plus a signature card. Inline SVG (CSP: no external asset, no style attribute).
 * Frames, arrow and stamp use token classes, so they follow the light/dark theme; the people,
 * clothes and signature paper keep fixed colours, like a real photo. Text inside is numbers and units only (same in both
 * languages). viewBox + width/height + aspect box: no layout shift.
 */
export default function HeroArt({ lang, className = '' }: { lang: Lang; className?: string }) {
  return (
<div className={`card rounded-2xl p-3 shadow-lift sm:p-5 lg:p-6 ${className}`}>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 400 190"
    width="400"
    height="190"
    role="img"
    aria-labelledby="hero-art-t"
    fontFamily="inherit"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="block aspect-[400/190] h-auto w-full"
  >
    <title id="hero-art-t">{t(lang, 'site.home.heroArtAlt')}</title>
    {/* phone photo: a casual selfie */}
    <rect x="6" y="4" width="118" height="144" rx="14" className="fill-card stroke-ink"/>
    <rect x="15" y="13" width="100" height="126" rx="8" className="fill-rule"/>
    <rect x="24" y="22" width="28" height="34" rx="4" className="fill-paper"/>
    <path d="M38 22v34M24 39h28" className="fill-none stroke-rule"/>
    <rect x="86" y="24" width="20" height="30" rx="3" fill="#86A97A" stroke="none"/>
    <path d="M44 139c2-22 13-32 30-32s28 10 30 32z" fill="#0F766E" stroke="none"/>
    <path d="M67 100h14v9l-7 5-7-5z" fill="#C68B66" stroke="none"/>
    <ellipse cx="74" cy="80" rx="16" ry="19" fill="#D59A74" stroke="none"/>
    <path
      d="M57 79c-2-16 7-24 17-24s20 7 17 24c-2-8-8-13-17-13s-15 5-17 13z"
      fill="#1F2937"
      stroke="none"/>
    <circle cx="68" cy="81" r="1.7" fill="#1F2937" stroke="none"/>
    <circle cx="80" cy="81" r="1.7" fill="#1F2937" stroke="none"/>
    <path d="M68 90c4 4 8 4 12 0" fill="none" stroke="#8A4B33" strokeWidth="1.6"/>
    <g textAnchor="middle">
      <text x="65" y="171" fontSize="16" fontWeight="700" className="fill-ink">4.2 MB</text>
      <text x="65" y="187" fontSize="13" className="fill-muted">3024×4032</text>
    </g>
    {/* arrow */}
    <path d="M138 76h40M220 76h36" strokeDasharray="0 7" className="fill-none stroke-ink"/>
    <path d="M253 70l6 6-6 6" className="fill-none stroke-ink"/>
    <circle cx="199" cy="76" r="18" className="fill-saffron"/>
    <path d="M191 76h16m-6-6 6 6-6 6" className="fill-none stroke-on-saffron"/>
    {/* passport-size photo, 200×230: formal, plain background */}
    <rect x="273" y="26" width="88" height="101" rx="12" className="fill-card stroke-ink"/>
    <rect x="280" y="33" width="74" height="86" rx="6" fill="#EAF0F7" className="stroke-rule"/>
    <path d="M289 119c2-17 12-25 28-25s26 8 28 25z" fill="#1E3A8A" stroke="none"/>
    <path d="M310 90h14v8l-7 5-7-5z" fill="#C68B66" stroke="none"/>
    <path d="M309 96l8 8 8-8" fill="none" stroke="#FFFFFF" strokeWidth="2"/>
    <ellipse cx="317" cy="70" rx="15" ry="18" fill="#D59A74" stroke="none"/>
    <path
      d="M301 69c-1-15 7-22 16-22s18 7 16 22c-2-8-8-12-16-12s-14 4-16 12z"
      fill="#1F2937"
      stroke="none"/>
    <circle cx="311.5" cy="71" r="1.6" fill="#1F2937" stroke="none"/>
    <circle cx="322.5" cy="71" r="1.6" fill="#1F2937" stroke="none"/>
    <path d="M312 79c3 2 7 2 10 0" fill="none" stroke="#8A4B33" strokeWidth="1.5"/>
    {/* signature card */}
    <g transform="translate(226 102) rotate(-6)">
      <rect width="58" height="30" rx="5" fill="#FFFFFF" className="stroke-ink"/>
      <path
        d="M8 21c3-9 6-13 9-10s-3 11 0 11 4-11 8-11-1 9 3 9 4-6 7-6 1 5 4 5 6-6 10-7M10 25c14-2 28-3 40-2"
        fill="none"
        stroke="#0F172A"
        strokeWidth="1.8"/>
    </g>
    <g transform="translate(352 124) rotate(-12)">
      <rect x="-30" y="-13" width="60" height="26" rx="13" className="fill-chalk-soft stroke-chalk"
      />
      <text
        y="5"
        fontSize="14"
        fontWeight="800"
        letterSpacing="1.5"
        textAnchor="middle"
        className="fill-chalk-text">PASS</text
      >
    </g>
    <g textAnchor="middle">
      <text x="317" y="171" fontSize="16" fontWeight="700" className="fill-ink">18.8 KB</text>
      <text x="317" y="187" fontSize="13" fontWeight="600" className="fill-chalk-text"
        >200×230 px ✓</text
      >
    </g>
  </svg>
</div>
  );
}
