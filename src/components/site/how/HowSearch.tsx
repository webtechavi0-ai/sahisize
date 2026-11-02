/** How it works, step 1: exam search with "IBPS PO" typed and the match highlighted. Static SVG, no JS. */
export default function HowSearch({ title }: { title: string }) {
  return (
    <svg viewBox="0 0 240 120" role="img" className="h-full w-full" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fontFamily="inherit" aria-labelledby="how-art-1">
      <title id="how-art-1">{title}</title>
      <rect x="20" y="13" width="200" height="36" rx="12" className="fill-card stroke-ink" />
      <circle cx="39" cy="29" r="6" className="stroke-ink" />
      <path d="M43.5 33.5l4 4" className="stroke-ink" />
      <text x="56" y="36" fontSize="15" fontWeight="700" className="fill-ink">IBPS PO</text>
      <path d="M121 23v13" className="stroke-saffron" />
      <rect x="20" y="57" width="200" height="54" rx="12" className="fill-card stroke-rule-strong" />
      <rect x="28" y="64" width="184" height="20" rx="10" className="fill-saffron" />
      <text x="40" y="78" fontSize="11" fontWeight="700" className="fill-on-saffron">IBPS PO</text>
      <path d="M190 74l4 4 7-8" className="stroke-on-saffron" />
      <rect x="40" y="94" width="64" height="6" rx="3" className="fill-rule" />
      <rect x="112" y="94" width="36" height="6" rx="3" className="fill-rule" />
    </svg>
  );
}
