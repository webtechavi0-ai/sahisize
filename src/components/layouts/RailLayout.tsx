/**
 * "Desk + side rail" page grid (docs/design/inner-pages-spec.md §1.1). Server component.
 *
 * One DOM order at every width: head → main-top (the page's action) → rail → main-rest.
 * From 1024 px a CSS grid moves the rail into a right column (320 / 360 / 400 px); below that it
 * sits right under the action block, never above it. The rail is sticky only when the server's
 * height estimate says it fits the viewport (rail-fit.ts). With no rail, the main column spans
 * the page, as before.
 */
import type { ReactNode } from 'react';
import { STICKY, type RailFit } from '@/components/rail/rail-fit';

export interface RailLayoutProps {
  /** Breadcrumbs + H1 + intro (full width). */
  head: ReactNode;
  /** The page's action block (CTA card, tool, comparison table). */
  top: ReactNode;
  /** Side-rail blocks; null → no <aside>. */
  rail: ReactNode | null;
  /** Everything else, in the page's existing order. */
  children: ReactNode;
  /** aria-label of the <aside>. */
  railLabel: string;
  fit: RailFit;
  /** Tool and hub pages: the action block spans both columns, the rail starts beside the prose. */
  topFull?: boolean;
}

export default function RailLayout({ head, top, rail, children, railLabel, fit, topFull = false }: RailLayoutProps) {
  if (!rail) {
    return (
      <>
        <div data-page-head className="min-w-0">
          {head}
        </div>
        <div data-main-top className="mt-4 min-w-0 sm:mt-5">
          {top}
        </div>
        <div data-main-rest className="min-w-0">
          {children}
        </div>
      </>
    );
  }
  return (
    <>
      <div data-page-head className="min-w-0">
        {head}
      </div>
      <div
        data-rail-grid
        className="mt-4 grid grid-cols-1 gap-y-6 sm:mt-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:grid-rows-[auto_1fr] lg:gap-x-8 xl:grid-cols-[minmax(0,1fr)_360px] xl:gap-x-10 wide:grid-cols-[minmax(0,1fr)_400px] wide:gap-x-12"
      >
        <div data-main-top className={`min-w-0 lg:col-start-1 lg:row-start-1 ${topFull ? 'lg:col-span-2' : ''}`}>
          {top}
        </div>
        <aside
          data-rail
          aria-label={railLabel}
          className={`min-w-0 lg:col-start-2 lg:self-start ${topFull ? 'lg:row-start-2' : 'lg:row-span-2 lg:row-start-1'} ${STICKY[fit]}`}
        >
          {rail}
        </aside>
        <div data-main-rest className="min-w-0 lg:col-start-1 lg:row-start-2">
          {children}
        </div>
      </div>
    </>
  );
}
