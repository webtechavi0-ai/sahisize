/**
 * Assembles side-rail blocks (inner-pages spec §2, §3.6). Each block factory returns a RailItem
 * or null when its data is missing; buildRail drops the nulls, decides which blocks span both
 * columns on tablets, and picks the sticky bucket from the summed height estimate.
 */
import { Fragment, type ReactNode } from 'react';
import type { Lang } from '@/i18n/config';
import { railEstimate, railFit, type RailFit } from './rail-fit';

export interface RailItem {
  key: string;
  /** Estimated height at a 320 px rail (rail-fit.ts). */
  height: number;
  /** Shares a row with another half block on tablets (768–1023); false = full row. */
  half: boolean;
  /** `span` is 'md:col-span-2' when the block takes a whole tablet row, else ''. */
  render: (span: string) => ReactNode;
}

export interface BuiltRail {
  rail: ReactNode | null;
  fit: RailFit;
  /** Estimated height (px), for tests and calibration. */
  estimate: number;
  keys: string[];
}

export function buildRail(items: readonly (RailItem | null | undefined)[], lang: Lang): BuiltRail {
  const list = items.filter((x): x is RailItem => !!x);
  if (list.length === 0) return { rail: null, fit: 'none', estimate: 0, keys: [] };
  // Tablet rows use grid-flow-dense, so halves pair up in order; an odd last half fills its row.
  const halves = list.filter((x) => x.half);
  const lonely = halves.length % 2 === 1 ? halves[halves.length - 1] : undefined;
  const estimate = railEstimate(
    list.map((x) => x.height),
    lang === 'hi',
  );
  return {
    fit: railFit(estimate),
    estimate,
    keys: list.map((x) => x.key),
    rail: (
      <div data-rail-estimate={estimate} className="space-y-4 md:grid md:grid-flow-row-dense md:grid-cols-2 md:items-start md:gap-4 md:space-y-0 lg:block lg:space-y-4">
        {list.map((x) => (
          <Fragment key={x.key}>{x.render(!x.half || x === lonely ? 'md:col-span-2' : '')}</Fragment>
        ))}
      </div>
    ),
  };
}
