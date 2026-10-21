/**
 * Result block shared by every tool (SPEC 6.5, K7): preview (images), live KB meter,
 * the same PassCheck card as the kit, notes, and a Download button that stays disabled
 * while any required check fails. Downloads are local object URLs only.
 */
import type { ComponentChildren } from 'preact';
import type { DocType, FitCheck, FitWarning } from '@/engine/types';
import { Download } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { KbMeter } from '@/components/kit/KbMeter';
import { PassCheck, canDownload } from '@/components/kit/PassCheck';
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
  children?: ComponentChildren;
  downloadLabel?: string;
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
}: Props) {
  const ok = canDownload(output.checks);
  const file = () => new File([output.blob], output.fileName, { type: output.blob.type });
  return (
    <section class="space-y-4" aria-labelledby="tool-result-h">
      <h2 id="tool-result-h" class="text-lg font-bold">
        {ok ? t('tool.common.resultReady', { kb: formatKB(output.sizeBytes) }) : t('tool.common.resultFail')}
      </h2>
      {image && output.width !== undefined && output.height !== undefined && (
        <ResultPreview
          t={t}
          after={output.blob}
          width={output.width}
          height={output.height}
          before={before ?? null}
          alt={t('tool.common.resultAlt')}
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
      <PassCheck t={t} checks={output.checks} />
      {output.warnings && output.warnings.length > 0 && (
        <ul class="space-y-1 text-sm text-muted">
          {output.warnings.map((w) => (
            <li key={w}>{t(`kit.result.warnings.${w}`)}</li>
          ))}
        </ul>
      )}
      {children}
      <div class="sticky bottom-0 z-10 -mx-4 space-y-2 border-t border-border bg-bg/95 px-4 py-3 sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
        <Button
          variant="primary"
          block
          disabled={!ok}
          onClick={() => {
            downloadBlob(output.blob, output.fileName);
            track('doc_downloaded', { tool, doc, via: 'download' });
          }}
        >
          <Download size={20} aria-hidden="true" />
          {downloadLabel ?? t('tool.common.download', { name: output.fileName })}
        </Button>
        {ok && (
          <ShareButton
            block
            label={t('common.actions.share')}
            title={output.fileName}
            getFiles={() => [file()]}
            onShared={() => track('doc_downloaded', { tool, doc, via: 'share' })}
          />
        )}
        {!ok && <p class="text-sm text-error-text">{t('tool.common.downloadOff')}</p>}
      </div>
    </section>
  );
}
