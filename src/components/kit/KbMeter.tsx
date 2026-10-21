/**
 * Live size meter (SPEC 6.4 result screen): file size against the allowed KB window,
 * plus pixel dimensions. SVG geometry uses attributes only (CSP-safe).
 * Reusable by tool islands (F).
 */
import { KB } from '@/engine/types';
import { formatKB, kbRangeText, pxText, type T } from '@/lib/format';

interface Props {
  t: T;
  sizeBytes: number;
  minKB: number | null;
  maxKB: number | null;
  widthPx?: number;
  heightPx?: number;
}

export function meterScale(sizeBytes: number, maxKB: number | null): number {
  const kb = sizeBytes / KB;
  return Math.max((maxKB ?? kb) * 1.25, kb * 1.1, 1);
}

export function KbMeter({ t, sizeBytes, minKB, maxKB, widthPx, heightPx }: Props) {
  const kb = sizeBytes / KB;
  const top = meterScale(sizeBytes, maxKB);
  const pct = (v: number) => `${Math.max(0, Math.min(100, (v / top) * 100)).toFixed(2)}%`;
  const inRange = maxKB !== null && sizeBytes <= maxKB * 1000 && sizeBytes >= (minKB ?? 0) * KB; // Q26 hard limits
  const range = kbRangeText(t, minKB, maxKB);
  return (
    <div class="card p-4">
      <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p class="text-2xl font-bold tabular-nums">{formatKB(sizeBytes)}</p>
        {widthPx !== undefined && heightPx !== undefined && (
          <p class="tabular-nums text-muted">{pxText(t, widthPx, heightPx)}</p>
        )}
      </div>
      <svg
        class="mt-3 block h-6 w-full"
        role="img"
        aria-label={t('ui.meter.label', { size: formatKB(sizeBytes), range })}
        preserveAspectRatio="none"
      >
        <rect x="0" y="8" width="100%" height="8" rx="4" class="fill-border" />
        {maxKB !== null && (
          <rect
            x={pct(minKB ?? 0)}
            y="8"
            width={`${(((maxKB - (minKB ?? 0)) / top) * 100).toFixed(2)}%`}
            height="8"
            class="fill-success/40"
          />
        )}
        <rect
          x={pct(kb)}
          y="2"
          width="4"
          height="20"
          rx="2"
          class={inRange ? 'fill-success' : 'fill-error'}
        />
      </svg>
      <p class={`mt-1 text-sm ${inRange ? 'text-success-text' : 'text-error-text'}`}>
        {t(inRange ? 'ui.meter.inRange' : 'ui.meter.outOfRange', { range })}
      </p>
    </div>
  );
}
