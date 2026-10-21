/**
 * Build-time OG images (SPEC 3.4, 9.1; PLAN 3.14). satori -> SVG -> resvg -> PNG,
 * 1200×630, English only (QUESTIONS Q9: satori cannot shape Devanagari).
 *
 * Fonts: Inter WOFF (satori reads TTF/OTF/WOFF, not WOFF2) in src/assets/og-fonts/.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { SITE_NAME, SITE_URL, THEME_COLOR } from '@/config/site';

export interface OgInput {
  /** Big line, e.g. "IBPS PO". */
  title: string;
  /** Second line, e.g. "Photo & Signature Size". */
  subtitle: string;
  /** Small badge, e.g. "2026". */
  badge?: string;
}

type Node = { type: string; props: Record<string, unknown> & { children?: unknown } };
const h = (type: string, style: Record<string, unknown>, children?: unknown): Node => ({
  type,
  props: { style, children },
});

let fonts: { name: string; data: Buffer; weight: 400 | 700; style: 'normal' }[] | null = null;
function loadFonts() {
  if (fonts) return fonts;
  const dir = join(process.cwd(), 'src/assets/og-fonts');
  fonts = [
    {
      name: 'Inter',
      data: readFileSync(join(dir, 'inter-latin-400-normal.woff')),
      weight: 400,
      style: 'normal',
    },
    {
      name: 'Inter',
      data: readFileSync(join(dir, 'inter-latin-700-normal.woff')),
      weight: 700,
      style: 'normal',
    },
  ];
  return fonts;
}

/** Logo mark (SPEC 3.4) as an inline SVG node. */
function logoMark(size: number): Node {
  const el = (type: string, props: Record<string, unknown>): Node => ({ type, props });
  return {
    type: 'svg',
    props: {
      width: size,
      height: size,
      viewBox: '0 0 64 64',
      children: [
        el('rect', { x: 8, y: 4, width: 48, height: 56, rx: 8, fill: '#F8FAFC' }),
        el('rect', { x: 14, y: 10, width: 36, height: 44, rx: 4, fill: THEME_COLOR }),
        el('path', {
          d: 'M21 33l8 8 15-17',
          fill: 'none',
          stroke: '#F59E0B',
          strokeWidth: 6,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }),
      ],
    },
  };
}

/** Tree for satori. Exported for tests. */
export function ogTree(input: OgInput): Node {
  const domain = SITE_URL.replace(/^https?:\/\//, '');
  const titleSize = input.title.length > 28 ? 64 : input.title.length > 18 ? 80 : 96;
  return h(
    'div',
    {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      // satori sizes are content-box: 1056 + 2×72 = 1200, 502 + 2×64 = 630.
      width: 1056,
      height: 502,
      padding: '64px 72px',
      background: THEME_COLOR,
      color: '#FFFFFF',
      fontFamily: 'Inter',
    },
    [
      h('div', { display: 'flex', alignItems: 'center', gap: 20 }, [
        logoMark(72),
        h('div', { display: 'flex', fontSize: 44, fontWeight: 700 }, [
          h('span', { color: '#FBBF24' }, 'Sahi'),
          h('span', { color: '#FFFFFF' }, 'Size'),
        ]),
      ]),
      h('div', { display: 'flex', flexDirection: 'column', gap: 12 }, [
        h(
          'div',
          { display: 'flex', fontSize: titleSize, fontWeight: 700, lineHeight: 1.05 },
          input.title,
        ),
        h('div', { display: 'flex', fontSize: 48, color: '#DBE4FF' }, input.subtitle),
      ]),
      h('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, [
        h(
          'div',
          { display: 'flex', fontSize: 30, color: '#DBE4FF' },
          'Right size, first time. Nothing is uploaded.',
        ),
        input.badge
          ? h(
              'div',
              {
                display: 'flex',
                fontSize: 30,
                fontWeight: 700,
                background: '#F59E0B',
                color: '#0F172A',
                padding: '8px 20px',
                borderRadius: 12,
              },
              input.badge,
            )
          : h('div', { display: 'flex', fontSize: 28, color: '#DBE4FF' }, domain || SITE_NAME),
      ]),
    ],
  );
}

export async function renderOgPng(input: OgInput): Promise<Uint8Array> {
  // satori's types expect ReactNode; our plain object tree is the same shape.
  const svg = await satori(ogTree(input) as unknown as Parameters<typeof satori>[0], {
    width: 1200,
    height: 630,
    fonts: loadFonts(),
  });
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
  return new Uint8Array(png);
}

/** Path of the OG image for an English path ("/exam/ibps-po" -> "/og/exam/ibps-po.png"). */
export function ogPathFor(enPath: string): string {
  if (enPath === '/' || enPath === '') return '/og/home.png';
  return `/og${enPath}.png`;
}
