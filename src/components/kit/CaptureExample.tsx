'use client';
/**
 * Upload step "Good / Avoid" example pair for photo, signature and thumb. Inline SVG (CSP: no
 * external asset, no style attribute). The drawings stand for real paper and photos, so they
 * keep fixed light colours in both themes; the captions carry the meaning for screen readers.
 */
import type { ReactElement } from 'react';
import { CircleCheck, CircleX } from '@/components/ui/Icon';
import type { T } from '@/lib/format';

export type ExampleDoc = 'photo' | 'signature' | 'thumb';

export const hasCaptureExample = (doc: string): doc is ExampleDoc =>
  doc === 'photo' || doc === 'signature' || doc === 'thumb';

const SIGNATURE =
  'M26 68C30 48 38 38 45 44C52 50 41 73 47 75C53 77 56 52 63 50C70 48 63 71 69 71C75 71 77 57 83 57C89 57 85 69 91 69C99 69 104 50 112 52C119 54 110 69 118 67C125 65 129 59 136 56M32 81C62 76 100 74 132 77';

const Sheet = ({ fill = '#FFFFFF' }: { fill?: string }) => (
  <rect x="2" y="2" width="156" height="116" rx="8" fill={fill} stroke="#E2E8F0" strokeWidth="2" />
);

/** Head and shoulders, drawn in the 160×120 frame; `cap` and `shadow` make the "avoid" one. */
const Person = ({ cap = false, shadow = false }: { cap?: boolean; shadow?: boolean }) => (
  <g>
    <path d="M50 112c2-18 14-26 30-26s28 8 30 26z" fill="#1E3A8A" />
    <path d="M72 84h16v8l-8 6-8-6z" fill="#C68B66" />
    <path d="M70 91l10 10 10-10" fill="none" stroke="#FFFFFF" strokeWidth="2.5" />
    <ellipse cx="80" cy="56" rx="17" ry="21" fill="#D59A74" />
    {cap ? (
      <g>
        <path d="M61 47c2-14 10-20 19-20s17 6 19 20z" fill="#B91C1C" />
        <path d="M58 47h46" stroke="#7F1D1D" strokeWidth="4" strokeLinecap="round" />
      </g>
    ) : (
      <path d="M62 54c-1-16 8-25 18-25s20 8 18 25c-3-9-9-13-18-13s-15 4-18 13z" fill="#1F2937" />
    )}
    <circle cx="73.5" cy="57" r="1.8" fill="#1F2937" />
    <circle cx="86.5" cy="57" r="1.8" fill="#1F2937" />
    <path
      d="M75 67c3 2 7 2 10 0"
      fill="none"
      stroke="#8A4B33"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    {shadow && <path d="M80 35a17 21 0 0 1 0 42z" fill="#111827" opacity=".45" />}
  </g>
);

const RIDGES: [number, number, string][] = [
  [5, 8, '20 4'],
  [10, 15, '30 5 12 4'],
  [15, 22, '44 5 20 6'],
  [20, 29, '60 6 30 5'],
  [25, 36, '70 8 40 6'],
];

const ART: Record<ExampleDoc, { good: ReactElement; bad: ReactElement }> = {
  signature: {
    good: (
      <>
        <Sheet />
        <rect
          x="18"
          y="30"
          width="124"
          height="62"
          rx="4"
          fill="none"
          stroke="#F59E0B"
          strokeWidth="2"
          strokeDasharray="6 4"
        />
        <path
          d={SIGNATURE}
          fill="none"
          stroke="#0F172A"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    ),
    bad: (
      <>
        <Sheet fill="#F8FAFC" />
        <path d="M4 30h152M4 50h152M4 70h152M4 90h152" stroke="#BFDBFE" strokeWidth="1.2" />
        <path d="M94 3h56a7 7 0 0 1 7 7v100a7 7 0 0 1-7 7H44z" fill="#64748B" fillOpacity=".35" />
        <path
          d={SIGNATURE}
          transform="translate(46 44) scale(.42)"
          fill="none"
          stroke="#93C5FD"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    ),
  },
  photo: {
    good: (
      <>
        <Sheet />
        <rect x="44" y="8" width="72" height="104" rx="4" fill="#EAF0F7" />
        <Person />
      </>
    ),
    bad: (
      <>
        <Sheet />
        <rect x="44" y="8" width="72" height="104" rx="4" fill="#4B5563" />
        <rect x="48" y="14" width="18" height="30" rx="2" fill="#9CA3AF" opacity=".6" />
        <rect x="92" y="18" width="20" height="16" rx="2" fill="#A16207" opacity=".6" />
        <g transform="translate(18 26) scale(.75)">
          <Person cap shadow />
        </g>
      </>
    ),
  },
  thumb: {
    good: (
      <>
        <Sheet />
        <rect
          x="46"
          y="10"
          width="68"
          height="100"
          rx="4"
          fill="none"
          stroke="#F59E0B"
          strokeWidth="2"
          strokeDasharray="6 4"
        />
        <g fill="none" stroke="#1E293B" strokeWidth="2.2" strokeLinecap="round">
          {RIDGES.map(([rx, ry, dash]) => (
            <ellipse key={rx} cx="80" cy="60" rx={rx} ry={ry} strokeDasharray={dash} />
          ))}
        </g>
      </>
    ),
    bad: (
      <>
        <Sheet />
        <ellipse cx="72" cy="66" rx="30" ry="40" fill="#334155" opacity=".75" />
        <ellipse cx="96" cy="50" rx="18" ry="22" fill="#334155" opacity=".35" />
        <g fill="none" stroke="#64748B" strokeWidth="2" opacity=".7">
          <ellipse cx="72" cy="66" rx="14" ry="20" />
          <ellipse cx="72" cy="66" rx="22" ry="30" />
        </g>
      </>
    ),
  },
};

export function CaptureExample({ t, doc }: { t: T; doc: ExampleDoc }) {
  const art = ART[doc];
  const panel = (kind: 'good' | 'bad') => {
    const good = kind === 'good';
    const Mark = good ? CircleCheck : CircleX;
    return (
      <figure className="min-w-0">
        <svg
          viewBox="0 0 160 120"
          width="160"
          height="120"
          aria-hidden="true"
          className="block aspect-[4/3] h-auto w-full"
        >
          {art[kind]}
        </svg>
        <figcaption className="mt-2 text-sm">
          <span
            className={`flex items-center gap-1 font-semibold ${good ? 'text-success-text' : 'text-error-text'}`}
          >
            <Mark size={16} aria-hidden="true" className="shrink-0" />
            {t(good ? 'kit.example.good' : 'kit.example.avoid')}
          </span>
          <span className="mt-0.5 block text-muted">{t(`kit.example.${doc}.${kind}`)}</span>
        </figcaption>
      </figure>
    );
  };
  return (
    <section className="card p-4" data-testid="capture-example" data-doc={doc}>
      <h3 className="font-bold">{t('kit.example.title')}</h3>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {panel('good')}
        {panel('bad')}
      </div>
    </section>
  );
}
