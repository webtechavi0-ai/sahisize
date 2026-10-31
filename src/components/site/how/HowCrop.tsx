/** How it works, step 2: a sample photo in the cropper (handles, face oval, eye line) beside the document chips. Static SVG, no JS. */
export default function HowCrop({ title }: { title: string }) {
  return (
    <svg viewBox="0 0 240 120" role="img" className="h-full w-full" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fontFamily="inherit" aria-labelledby="how-art-2">
      <title id="how-art-2">{title}</title>
      <rect x="20" y="9" width="110" height="102" rx="14" className="fill-rule" />
      <path d="M44 110c2-17 14-25 31-25s29 8 31 25z" className="fill-muted" />
      <circle cx="75" cy="56" r="16" className="fill-muted" />
      <path d="M59 53c0-11 7-17 16-17s16 6 16 17c-4-6-9-8-16-8s-12 2-16 8z" className="fill-rule-strong" />
      <rect x="20" y="9" width="110" height="102" rx="14" className="stroke-ink" />
      <path d="M52 59h46" className="stroke-card" strokeDasharray="3 4" />
      <ellipse cx="75" cy="58" rx="24" ry="30" className="stroke-card" strokeDasharray="5 5" />
      <path d="M34 31v-11h11M105 20h11v11M116 89v11h-11M45 100h-11v-11" className="stroke-saffron" strokeWidth="4" />
      <rect x="146" y="15" width="74" height="26" rx="13" className="fill-card stroke-ink" />
      <rect x="157" y="21" width="12" height="14" rx="3" className="stroke-ink" />
      <circle cx="163" cy="26.5" r="2.5" className="fill-ink" stroke="none" />
      <path d="M179 28h30" className="stroke-rule" strokeWidth="4" />
      <rect x="146" y="47" width="74" height="26" rx="13" className="fill-card stroke-rule-strong" />
      <path d="M155 64c3-9 5-9 6-3s3 4 5-2 3 5 7 2" className="stroke-ink" />
      <path d="M179 60h30" className="stroke-rule" strokeWidth="4" />
      <rect x="146" y="79" width="74" height="26" rx="13" className="fill-card stroke-rule-strong" />
      <path d="M158 98v-6a5 5 0 0 1 10 0v6M163 98v-6" className="stroke-ink" />
      <path d="M179 92h30" className="stroke-rule" strokeWidth="4" />
    </svg>
  );
}
