'use client';
/**
 * T7 Compress PDF (SPEC 5.2, P1): re-render pages at 150 -> 100 -> 72 DPI as JPEG pages
 * until the file is under the target. Already-small PDFs report "already small"; mostly-text
 * PDFs stop before rasterising with a clear message and a "Compress anyway" action.
 * Warns that text becomes an image.
 */
import { useEffect, useMemo, useState } from 'react';
import type { Lang } from '@/config/site';
import { createT, type Dict } from '@/i18n/core';
import { isEngineError } from '@/engine/types';
import { Button } from '@/components/ui/Button';
import { CircleCheck, FileText, RefreshCw, TriangleAlert } from '@/components/ui/Icon';
import { LiveRegion } from '@/components/ui/LiveRegion';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Uploader, isPdf } from '@/components/kit/Uploader';
import { TrustLine } from '@/components/kit/TrustLine';
import { loadEngine } from '@/components/kit/engine';
import { errorCode, errorMessage } from '@/components/kit/errors';
import { passSummary } from '@/components/kit/PassCheck';
import { inputFormat, kbBucket, track } from '@/lib/analytics';
import { formatKB } from '@/lib/format';
import { SettingsPanel } from '@/components/tools/SettingsPanel';
import { TargetKbPicker } from '@/components/tools/TargetKbPicker';
import { ResultPanel, type ToolOutput } from '@/components/tools/ResultPanel';
import { useRun } from '@/components/tools/useRun';
import { baseName, kbLabel, outputChecks, withPreset } from '@/components/tools/logic';
import { ToolColumns } from '@/components/tools/ToolColumns';

export interface ToolCompressPdfProps {
  lang: Lang;
  dict: Dict;
  /** Starting maximum (KB) for /tools/compress-pdf-to-[n]kb pages; also shown as a chip. */
  initialKB?: number;
}

const TOOL = 'compress-pdf';
const PDF_PRESETS = [100, 200, 300, 500, 1000] as const;

export default function ToolCompressPdf({ dict, initialKB = 300 }: ToolCompressPdfProps) {
  const t = useMemo(() => createT(dict), [dict]);
  const presets = useMemo(() => withPreset(PDF_PRESETS, initialKB), [initialKB]);
  const [file, setFile] = useState<File | null>(null);
  const [fileErr, setFileErr] = useState<string | null>(null);
  const [maxKB, setMaxKB] = useState<number | null>(initialKB);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [announce, setAnnounce] = useState('');
  const job = useRun<ToolOutput>();
  const kbOk = maxKB !== null && maxKB >= 5 && maxKB <= 50 * 1024;

  useEffect(() => job.clear(), [file, maxKB]);

  const pick = (f: File) => {
    if (!isPdf(f)) {
      setFileErr(t('tool.compressPdf.notPdf'));
      return;
    }
    setFileErr(null);
    setFile(f);
    track('doc_uploaded', { tool: TOOL, doc: 'certificate', inputFormat: inputFormat(f.type, f.name), kbBucket: kbBucket(f.size) });
  };

  const run = (allowTextOnly = false) => {
    if (!file || !kbOk || maxKB === null) return;
    setAnnounce(t('tool.compressPdf.working'));
    setProgress({ done: 0, total: 1 });
    void job
      .run(async () => {
        const engine = await loadEngine();
        const bytes = await engine.compressPdf(file, maxKB, {
          allowTextOnly,
          onProgress: (done, total) => setProgress({ done, total }),
        });
        const checks = outputChecks({ bytes, format: 'pdf', maxKB });
        track('tool_used', { tool: TOOL, target: kbLabel(maxKB) });
        setAnnounce(`${t('tool.common.resultReady', { kb: formatKB(bytes.length) })} ${passSummary(t, checks)}`);
        return {
          blob: new Blob([bytes], { type: 'application/pdf' }),
          fileName: `${baseName(file.name, 'document')}-${kbLabel(maxKB)}kb.pdf`,
          sizeBytes: bytes.length,
          checks,
        };
      })
      .finally(() => setProgress(null));
  };

  const alreadySmall = isEngineError(job.error) && job.error.code === 'ALREADY_SMALL';
  const textOnly = isEngineError(job.error) && job.error.code === 'PDF_TEXT_ONLY';
  useEffect(() => {
    if (!job.error) return;
    if (alreadySmall) track('tool_used', { tool: TOOL, target: 'already-small' });
    else if (textOnly) track('error', { code: 'PDF_TEXT_ONLY', tool: TOOL });
    else track('error', { code: errorCode(job.error), tool: TOOL });
    setAnnounce(errorMessage(t, job.error));
  }, [job.error]);

  return (
    <ToolColumns
      empty={t('tool.common.resultEmpty')}
      active={!!progress || alreadySmall || !!job.error || !!job.result}
      input={
        <>
      <div className="card space-y-3 p-4">
        {!file ? (
          <>
            <Uploader t={t} accept="pdf" capture={false} onFiles={(fs) => fs[0] && pick(fs[0])} />
            {fileErr && (
              <p role="alert" className="rounded-card border border-error p-3 text-sm text-error-text">
                {fileErr}
              </p>
            )}
          </>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-card border border-border text-muted">
              <FileText size={26} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1 text-sm">
              <p className="truncate font-semibold">{file.name}</p>
              <p className="tabular-nums text-muted">{formatKB(file.size)}</p>
              <TrustLine text={t('common.trustLine')} className="mt-1" />
            </div>
            <Button onClick={() => setFile(null)} disabled={job.busy}>
              <RefreshCw size={18} aria-hidden="true" />
              <span className="text-sm">{t('tool.common.changeFile')}</span>
            </Button>
          </div>
        )}
      </div>
      <SettingsPanel title={t('tool.common.settings')}>
        <TargetKbPicker t={t} value={maxKB} onChange={setMaxKB} presets={presets} label={t('tool.common.maxKb')} />
        <p className="flex gap-2 rounded-card bg-bg p-3 text-sm">
          <TriangleAlert size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-saffron-text" />
          <span>{t('tool.compressPdf.warning')}</span>
        </p>
      </SettingsPanel>
      <Button variant="primary" block busy={job.busy} disabled={!file || !kbOk} onClick={() => run()}>
        {maxKB !== null ? t('tool.compressPdf.run', { kb: kbLabel(maxKB) }) : t('tool.compressPdf.runNoKb')}
      </Button>
        </>
      }
      output={
        <>
      {progress && (
        <ProgressBar
          value={progress.done}
          max={progress.total}
          label={t('tool.compressPdf.working')}
          valueText={t('tool.common.progress', progress)}
        />
      )}
      {!job.busy && alreadySmall && (
        <p role="status" className="flex gap-2 rounded-card border border-success p-3 text-sm">
          <CircleCheck size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-success" />
          <span>
            {errorMessage(t, job.error)} {t('tool.compressPdf.useAsIs')}
          </span>
        </p>
      )}
      {!job.busy && job.error && !alreadySmall && (
        <p role="alert" className="rounded-card border border-error p-3 text-sm text-error-text">
          {errorMessage(t, job.error)}
        </p>
      )}
      {!job.busy && textOnly && (
        <Button block onClick={() => run(true)}>
          {t('tool.compressPdf.compressAnyway')}
        </Button>
      )}
      {!job.busy && job.result && maxKB !== null && (
        <ResultPanel t={t} tool={TOOL} doc="certificate" output={job.result} image={false} meter={{ minKB: null, maxKB }} />
      )}
        </>
      }
      footer={<LiveRegion message={announce} />}
    />
  );
}
