/**
 * T6 Images to PDF (SPEC 5.2, P1): up to 20 images (or PDFs, rasterised), reorder by drag
 * or keyboard, A4 or original page size, optional max KB. Mounted by /tools/images-to-pdf (+ Hindi).
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import type { Lang } from '@/config/site';
import { createT, type Dict } from '@/i18n/core';
import { Button } from '@/components/ui/Button';
import { FileText } from '@/components/ui/Icon';
import { LiveRegion } from '@/components/ui/LiveRegion';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Toggle } from '@/components/ui/Toggle';
import { Uploader } from '@/components/kit/Uploader';
import { loadEngine } from '@/components/kit/engine';
import { errorCode, errorMessage } from '@/components/kit/errors';
import { passSummary } from '@/components/kit/PassCheck';
import { track } from '@/lib/analytics';
import { formatKB } from '@/lib/format';
import { Choice, SettingsPanel } from '@/components/tools/SettingsPanel';
import { TargetKbPicker } from '@/components/tools/TargetKbPicker';
import { ImageList, type ListItem } from '@/components/tools/ImageList';
import { ResultPanel, type ToolOutput } from '@/components/tools/ResultPanel';
import { useRun } from '@/components/tools/useRun';
import { MAX_FILES, addCapped, kbLabel, outputChecks } from '@/components/tools/logic';
import { ToolColumns } from '@/components/tools/ToolColumns';

export interface ToolImagesToPdfProps {
  lang: Lang;
  dict: Dict;
}

const TOOL = 'images-to-pdf';
const PDF_PRESETS = [100, 200, 300, 500, 1000] as const;
let nextId = 1;

export default function ToolImagesToPdf({ dict }: ToolImagesToPdfProps) {
  const t = useMemo(() => createT(dict), [dict]);
  const [items, setItems] = useState<ListItem[]>([]);
  const [page, setPage] = useState<'a4' | 'original'>('a4');
  const [limit, setLimit] = useState(true);
  const [maxKB, setMaxKB] = useState<number | null>(300);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [announce, setAnnounce] = useState('');
  const job = useRun<ToolOutput>();

  // Any change to the inputs or settings makes an old result stale.
  useEffect(() => job.clear(), [items, page, limit, maxKB]);

  const add = (files: File[]) => {
    const { list, dropped } = addCapped(items, files.map((file) => ({ id: `f${nextId++}`, file })));
    setItems(list);
    setNotice(dropped ? t('tool.pdf.tooMany', { max: MAX_FILES, n: dropped }) : null);
  };

  const cap = limit ? maxKB : null;
  const kbOk = cap === null || (cap >= 5 && cap <= 50 * 1024);

  const make = () => {
    if (!items.length || !kbOk) return;
    setAnnounce(t('tool.pdf.making', { done: 0, total: items.length }));
    setProgress({ done: 0, total: items.length });
    void job
      .run(async () => {
        const engine = await loadEngine();
        const bytes = await engine.imagesToPdf(
          items.map((i) => i.file),
          {
            page,
            maxKB: cap,
            onProgress: (done, total) => setProgress({ done, total }),
          },
        );
        const checks = outputChecks({ bytes, format: 'pdf', maxKB: cap });
        track('tool_used', { tool: TOOL, target: cap === null ? 'none' : kbLabel(cap) });
        setAnnounce(`${t('tool.common.resultReady', { kb: formatKB(bytes.length) })} ${passSummary(t, checks)}`);
        return {
          blob: new Blob([bytes], { type: 'application/pdf' }),
          fileName: cap === null ? 'documents.pdf' : `documents-${kbLabel(cap)}kb.pdf`,
          sizeBytes: bytes.length,
          checks,
        };
      })
      .finally(() => setProgress(null));
  };

  useEffect(() => {
    if (job.error) {
      track('error', { code: errorCode(job.error), tool: TOOL });
      setAnnounce(errorMessage(t, job.error));
    }
  }, [job.error]);

  return (
    <ToolColumns
      empty={t('tool.common.resultEmpty')}
      active={!!progress || !!job.error || !!job.result}
      input={
        <>
      <div class="card space-y-3 p-4">
        {items.length < MAX_FILES && (
          <Uploader t={t} multiple allowPdf capture="environment" busy={job.busy} onFiles={add} />
        )}
        {notice && <p class="text-sm text-saffron-text">{notice}</p>}
        {items.length > 0 && (
          <ImageList t={t} items={items} onChange={setItems} label={t('tool.pdf.listLabel')} disabled={job.busy} />
        )}
        <p class="text-sm text-muted">{t('tool.pdf.count', { n: items.length, max: MAX_FILES })}</p>
      </div>
      <SettingsPanel title={t('tool.common.settings')}>
        <Choice
          label={t('tool.pdf.page')}
          value={page}
          options={[
            { value: 'a4', label: t('tool.pdf.a4') },
            { value: 'original', label: t('tool.pdf.original') },
          ]}
          onChange={setPage}
        />
        <Toggle label={t('tool.pdf.limit')} hint={t('tool.pdf.limitHint')} checked={limit} onChange={setLimit} />
        {limit && <TargetKbPicker t={t} value={maxKB} onChange={setMaxKB} presets={PDF_PRESETS} label={t('tool.common.maxKb')} />}
      </SettingsPanel>
      <Button variant="primary" block busy={job.busy} disabled={!items.length || !kbOk} onClick={make}>
        <FileText size={20} aria-hidden="true" />
        {t('tool.pdf.make', { n: items.length })}
      </Button>
        </>
      }
      output={
        <>
      {progress && (
        <ProgressBar
          value={progress.done}
          max={progress.total}
          label={t('tool.pdf.making', progress)}
          valueText={t('tool.common.progress', progress)}
        />
      )}
      {!job.busy && job.error && (
        <p role="alert" class="rounded-card border border-error p-3 text-sm text-error-text">
          {errorMessage(t, job.error)}
        </p>
      )}
      {!job.busy && job.result && (
        <ResultPanel
          t={t}
          tool={TOOL}
          doc="certificate"
          output={job.result}
          image={false}
          meter={cap !== null ? { minKB: null, maxKB: cap } : undefined}
        />
      )}
        </>
      }
      footer={<LiveRegion message={announce} />}
    />
  );
}
