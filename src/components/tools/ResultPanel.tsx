'use client';
/**
 * Result block shared by every tool (SPEC 6.5, K7). The result is the hero:
 *  1. "Ready: 18.8 KB" stamp + one plain line ("Right size. Download it, then upload it.")
 *  2. the Download button (phone: a sticky bottom bar, safe-area aware; from 640px it sits
 *     right under the heading), with Share next to it where the phone can share files
 *  3. before/after preview, the live KB meter
 *  4. the full PassCheck, folded away when everything passed (open when something failed)
 *  5. "Try another photo"
 * Download stays disabled while any required check fails. Downloads are local object URLs.
 * When a new result appears below the visible area (phones), it is scrolled into view.
 */
import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import type { DocType, FitCheck, FitWarning } from '@/engine/types';
import { Check, ChevronRight, Download, RefreshCw } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { KbMeter } from '@/components/kit/KbMeter';
import { PassCheck, canDownload, isRequired } from '@/components/kit/PassCheck';
import { ResultPreview } from '@/components/kit/ResultPreview';
import { ShareButton } from '@/components/kit/ShareButton';
import { track } from '@/lib/analytics';
import { downloadBlob } from '@/lib/download';
import { formatKB, type T } from '@/lib/format';

export interface ToolOutput {
  blob: Blob;
  fileName: string;
  sizeBytes: number;
  checks: FitCheck[];
  width?: number;
  height?: number;
  warnings?: FitWarning[];
}

interface Props {
  t: T;
  tool: string;
  doc?: DocType;
  output: ToolOutput;
  /** KB window for the meter; omit (undefined) to hide the meter. */
  meter?: { minKB: number | null; maxKB: number | null };
  before?: Blob | null;
  /** Show an image preview (false for PDFs). Default true. */
  image?: boolean;
  children?: ReactNode;
  downloadLabel?: string;
  /** "Try another photo": starts over with a new file. */
  onAgain?: () => void;
  againLabel?: string;
}

export function ResultPanel({
  t,
  tool,
  doc = 'other',
  output,
  meter,
  before,
  image = true,
  children,
  downloadLabel,
  onAgain,
  againLabel,
}: Props) {
  const ok = canDownload(output.checks);
  const ref = useRef<HTMLElement>(null);
  const file = () => new File([output.blob], output.fileName, { type: output.blob.type });
  const download = () => {
    downloadBlob(output.blob, output.fileName);
    track('doc_downloaded', { tool, doc, via: 'download' });
  };
  const required = output.checks.filter(isRequired);
  const passed = required.filter((c) => c.pass).length;

  // Bring a fresh result into view when it lands below the fold (never yank upwards, so
  // someone changing options further down the page stays where they are).
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof el.getBoundingClientRect !== 'function') return;
    const top = el.getBoundingClientRect().top;
    if (top > window.innerHeight * 0.6) {
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      el.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
    }
  }, [output]);

  return (
    <section ref={ref} className="flex scroll-mt-4 flex-col gap-4" aria-labelledby="tool-result-h" data-tool-result>
      <div className={`card border-2 p-4 ${ok ? 'border-chalk' : 'border-error'}`}>
        {/* Exam "PASS" stamp; the heading text stays exactly "Ready: N KB" (the tick is aria-hidden). */}
        <h2 id="tool-result-h" className="text-xl font-bold sm:text-2xl">
          {ok ? (
            <span className="stamp">
              <span
                aria-hidden="true"
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-saffron text-on-saffron"
              >
                <Check size={18} strokeWidth={3} />
              </span>
              {t('tool.common.resultReady', { kb: formatKB(output.sizeBytes) })}
            </span>
          ) : (
            t('tool.common.resultFail')
          )}
        </h2>
        <p className="mt-3 text-base">{t(ok ? 'tool.flow.readySub' : 'tool.flow.failSub')}</p>
        {output.width !== undefined && output.height !== undefined && (
          <p className="mt-1 text-sm tabular-nums text-muted">
            {t('common.units.px', { w: output.width, h: output.height })} · {output.fileName}
          </p>
        )}
      </div>
      {/* Phone: sticky bottom bar (safe-area aware). From 640px it sits under the heading. */}
      <div
        data-download-bar
        className="sticky bottom-0 z-20 order-last -mx-4 space-y-2 border-t border-rule bg-paper/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:static sm:order-none sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none"
      >
        <div className="flex gap-2">
          <Button
            variant="primary"
            block
            className="min-h-[56px] flex-1 text-lg shadow-lift"
            disabled={!ok}
            onClick={download}
          >
            <Download size={22} aria-hidden="true" />
            {downloadLabel ?? (
              <>
                {/* Short visible label; the full name (with the file name) for screen readers. */}
                <span aria-hidden="true">{t('tool.flow.download')}</span>
                <span className="sr-only">{t('tool.common.download', { name: output.fileName })}</span>
              </>
            )}
          </Button>
          {ok && (
            <ShareButton
              label={t('common.actions.share')}
              title={output.fileName}
              getFiles={() => [file()]}
              onShared={() => track('doc_downloaded', { tool, doc, via: 'share' })}
            />
          )}
        </div>
        {!ok && <p className="text-sm text-error-text">{t('tool.common.downloadOff')}</p>}
      </div>
      {image && output.width !== undefined && output.height !== undefined && (
        <ResultPreview
          t={t}
          after={output.blob}
          width={output.width}
          height={output.height}
          before={before ?? null}
          alt={t('tool.common.resultAlt')}
          sizeBytes={output.sizeBytes}
          onDownload={ok ? download : undefined}
        />
      )}
      {meter && (
        <KbMeter
          t={t}
          sizeBytes={output.sizeBytes}
          minKB={meter.minKB}
          maxKB={meter.maxKB}
          widthPx={output.width}
          heightPx={output.height}
        />
      )}
      <details className="group" open={!ok} data-tool-checks>
        <summary className="flex min-h-tap cursor-pointer list-none items-center gap-2 rounded-card px-1 font-semibold text-ink focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-ink [&::-webkit-details-marker]:hidden">
          <ChevronRight
            size={20}
            aria-hidden="true"
            className="shrink-0 transition-transform duration-150 group-open:rotate-90 motion-reduce:transition-none"
          />
          {t('tool.flow.checks', { n: passed, total: required.length })}
        </summary>
        <div className="mt-2">
          <PassCheck t={t} checks={output.checks} />
        </div>
      </details>
      {output.warnings && output.warnings.length > 0 && (
        <ul className="space-y-1 text-sm text-muted">
          {output.warnings.map((w) => (
            <li key={w}>{t(`kit.result.warnings.${w}`)}</li>
          ))}
        </ul>
      )}
      {children}
      {onAgain && (
        <Button block onClick={onAgain} data-tool-again>
          <RefreshCw size={18} aria-hidden="true" />
          {againLabel ?? t('tool.flow.again')}
        </Button>
      )}
    </section>
  );
}
