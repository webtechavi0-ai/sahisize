/**
 * Sticky side rail without JavaScript (docs/design/inner-pages-spec.md §2). Pure.
 *
 * CSS cannot compare an element's height with the viewport, so the server estimates the
 * rail's height (at the narrowest rail, 320 px) and picks one literal class string that turns
 * `position: sticky` on only for viewports at least that tall. Shorter screens get a rail that
 * scrolls with the page. The strings are literals so Tailwind's JIT generates them.
 *
 * Block heights were calibrated in Playwright at 1024×768 (English and Hindi) against the real
 * blocks; keep RAIL_PX in sync when a block's markup changes.
 */

export type RailFit = 'h720' | 'h800' | 'h900' | 'h1000' | 'h1100' | 'h1200' | 'none';

export const STICKY: Record<RailFit, string> = {
  h720: 'lg:top-6 lg:[@media(min-height:720px)]:sticky',
  h800: 'lg:top-6 lg:[@media(min-height:800px)]:sticky',
  h900: 'lg:top-6 lg:[@media(min-height:900px)]:sticky',
  h1000: 'lg:top-6 lg:[@media(min-height:1000px)]:sticky',
  h1100: 'lg:top-6 lg:[@media(min-height:1100px)]:sticky',
  h1200: 'lg:top-6 lg:[@media(min-height:1200px)]:sticky',
  none: '',
};

const BUCKETS: readonly [RailFit, number][] = [
  ['h720', 720],
  ['h800', 800],
  ['h900', 900],
  ['h1000', 1000],
  ['h1100', 1100],
  ['h1200', 1200],
];

/** 24 px sticky offset + 24 px breathing room below the rail. */
export const RAIL_SLACK = 48;
/** Devanagari needs taller lines (global Hindi line-height rules). */
export const HINDI_FACTOR = 1.12;

/** Smallest viewport-height bucket B with estimate + 48 <= B, else 'none' (never sticky). */
export function railFit(estimatePx: number): RailFit {
  for (const [fit, h] of BUCKETS) if (estimatePx + RAIL_SLACK <= h) return fit;
  return 'none';
}

/** Calibrated block heights at a 320 px rail (px). */
export const RAIL_PX = {
  /** Card padding (20 + 20 from 1280 px) + one-line heading row with its 12 px gap below + borders. */
  chrome: 90,
  /** Each extra heading line, and the characters that fit on one beside the icon well. */
  headLine: 11,
  headChars: 26,
  gap: 16,
  sizesRow: 190,
  sizesRowGap: 8,
  sizesNote: 52,
  shape: 224,
  /** Doc page shape row: drawing beside its numbers (56% of the card body, at most 170 px wide). */
  shapeRow: 119,
  /** Source folded into the doc-shape card, without its text lines: rule, gaps, button. */
  shapeSource: 81,
  /** One line of the source text (14 px) and the characters that fit on it. */
  noticeLine: 22,
  noticeChars: 32,
  shapeDpi: 20,
  /** One tip without its quote: padding, two clamped fix lines. */
  tipBase: 58,
  /** One line of the quoted error (13 px mono) and the characters that fit on it. */
  tipLine: 20,
  tipChars: 31,
  tipGap: 8,
  tipsAll: 52,
  sourceBase: 100,
  sourceUnverified: 84,
  sourceLink: 60,
  chipRow: 56,
  /** One-column chip: line height and characters per line in a 288 px chip. */
  chipLine: 20,
  chipChars: 30,
  relatedLegend: 44,
  relatedRow: 64,
  /** One line of a step (14 px) and the characters that fit beside the number. */
  stepLine: 20,
  stepChars: 33,
  stepGap: 10,
  hubSource: 120,
  hubStep: 48,
  member: 56,
  membersAll: 56,
  otherNext: 56,
  otherChip: 64,
  /** The illustration has a fixed height from 1024 px (object-cover), so it is the same at every rail width. */
  art: 214,
  artCompact: 108,
} as const;

/** Wrapped line count of `chars` characters at `perLine` per line (at least one). */
function lines(chars: number, perLine: number): number {
  return Math.max(1, Math.ceil(chars / perLine));
}

/** Card chrome for a heading of `title` (headings of more than ~26 characters wrap). */
function chrome(title?: string): number {
  return RAIL_PX.chrome + (title ? (lines(title.length, RAIL_PX.headChars) - 1) * RAIL_PX.headLine : 0);
}

/** Total rail estimate from block heights (16 px between blocks), Hindi scaled. */
export function railEstimate(blockHeights: readonly number[], hindi: boolean): number {
  if (blockHeights.length === 0) return 0;
  const sum = blockHeights.reduce((a, b) => a + b, 0) + RAIL_PX.gap * (blockHeights.length - 1);
  return Math.round(hindi ? sum * HINDI_FACTOR : sum);
}

export const railHeights = {
  sizes(tiles: number): number {
    const rows = Math.ceil(tiles / 3);
    return RAIL_PX.chrome + rows * RAIL_PX.sizesRow + (rows - 1) * RAIL_PX.sizesRowGap + RAIL_PX.sizesNote;
  },
  /** Stacked drawing (print-photo page). */
  shape(hasDpi: boolean): number {
    return RAIL_PX.chrome + RAIL_PX.shape + (hasDpi ? RAIL_PX.shapeDpi : 0);
  },
  /**
   * Doc page shape card: drawing row, plus the folded source when given (`notice`: notice name,
   * `meta`: the "page N · Checked <date>" line).
   */
  shapeRow(title: string, source: { verified: boolean; notice: string; meta: string } | null): number {
    if (!source) return chrome(title) + RAIL_PX.shapeRow;
    return (
      chrome(title) +
      RAIL_PX.shapeRow +
      RAIL_PX.shapeSource +
      (lines(source.notice.length, RAIL_PX.noticeChars) + lines(source.meta.length, RAIL_PX.noticeChars)) *
        RAIL_PX.noticeLine +
      (source.verified ? 0 : RAIL_PX.sourceUnverified)
    );
  },
  /** `quotes`: character count of each shown error quote (the quote is never clamped). */
  tips(quotes: readonly number[], seeAll: boolean, title: string): number {
    const body = quotes.reduce((a, n) => a + RAIL_PX.tipBase + lines(n + 2, RAIL_PX.tipChars) * RAIL_PX.tipLine, 0);
    return chrome(title) + body + (quotes.length - 1) * RAIL_PX.tipGap + (seeAll ? RAIL_PX.tipsAll : 0);
  },
  source(verified: boolean, hasPage: boolean): number {
    return (
      RAIL_PX.chrome +
      RAIL_PX.sourceBase +
      (hasPage ? 0 : -24) +
      (verified ? 0 : RAIL_PX.sourceUnverified) +
      RAIL_PX.sourceLink
    );
  },
  chips(n: number, legend: boolean): number {
    return RAIL_PX.chrome + Math.ceil(n / 2) * RAIL_PX.chipRow + (legend ? RAIL_PX.relatedLegend : 0);
  },
  /** One chip per row; `labels`: character count of each label (long ones wrap to two lines). */
  chipList(labels: readonly number[]): number {
    const rows = labels.reduce((a, n) => a + Math.max(48, 16 + lines(n, RAIL_PX.chipChars) * RAIL_PX.chipLine), 0);
    return RAIL_PX.chrome + rows + Math.max(0, labels.length - 1) * 8;
  },
  /** "Also applying for these?": one exam per row with an optional match line. */
  relatedRows(n: number): number {
    return RAIL_PX.chrome + n * RAIL_PX.relatedRow + Math.max(0, n - 1) * 8;
  },
  chips3(n: number): number {
    return RAIL_PX.chrome + Math.ceil(n / 3) * RAIL_PX.chipRow;
  },
  /** `texts`: character count of each step (name and text). */
  steps(texts: readonly number[]): number {
    const body = texts.reduce((a, n) => a + lines(n, RAIL_PX.stepChars) * RAIL_PX.stepLine, 0);
    return RAIL_PX.chrome + body + Math.max(0, texts.length - 1) * RAIL_PX.stepGap;
  },
  hubSource(): number {
    return RAIL_PX.chrome + RAIL_PX.hubSource + 3 * RAIL_PX.hubStep;
  },
  members(n: number, more: boolean): number {
    return RAIL_PX.chrome + n * RAIL_PX.member + (more ? RAIL_PX.membersAll : 0);
  },
  others(n: number, next: boolean): number {
    return RAIL_PX.chrome + (next ? RAIL_PX.otherNext : 0) + n * RAIL_PX.otherChip;
  },
  art(compact = false): number {
    return compact ? RAIL_PX.artCompact : RAIL_PX.art;
  },
};
