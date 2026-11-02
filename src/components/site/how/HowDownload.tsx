/** How it works, step 3: a finished file card with three passed checks and a download button. Static SVG, no JS. */
const rows = [
  { y: 68, label: '200×230 px' },
  { y: 84, label: '23 KB' },
  { y: 100, label: 'JPG' },
];

export default function HowDownload({ title }: { title: string }) {
  return (
    <svg viewBox="0 0 240 120" role="img" className="h-full w-full" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fontFamily="inherit" aria-labelledby="how-art-3">
      <title id="how-art-3">{title}</title>
      <rect x="20" y="9" width="146" height="102" rx="14" className="fill-card stroke-ink" />
      <path d="M33 20h11l6 6v16H33z" className="fill-paper stroke-ink" />
      <path d="M44 20v6h6" className="stroke-ink" />
      <text x="58" y="30" fontSize="12" fontWeight="700" className="fill-ink">photo.jpg</text>
      <text x="58" y="43" fontSize="10" className="fill-muted">23 KB</text>
      <path d="M30 52h126" className="stroke-rule" />
      {rows.map((r) => (
        <g key={r.y}>
          <circle cx="38" cy={r.y - 4} r="6" className="fill-chalk-soft stroke-chalk" />
          <path d={`M35 ${r.y - 4}l2 2 4-4`} className="stroke-chalk" />
          <text x="51" y={r.y} fontSize="10" fontWeight="600" className="fill-chalk-text">
            {r.label}
          </text>
        </g>
      ))}
      <circle cx="198" cy="56" r="22" className="fill-saffron" />
      <path d="M198 43v15M191 51l7 7 7-7M189 66h18" className="stroke-on-saffron" strokeWidth="2.5" />
    </svg>
  );
}
