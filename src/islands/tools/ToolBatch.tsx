/**
 * T9 Batch compress (SPEC 5.2, P1): up to 20 images to the same target KB, processed one
 * at a time (no engine cancel, Q16: "Stop" simply doesn't start the next file), each with
 * its own pass check, then one ZIP (fflate via the engine) or single downloads.
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Lang } from '@/config/site';
import { createT, type Dict } from '@/i18n/core';
import type { FitCheck } from '@/engine/types';
import { Button } from '@/components/ui/Button';
import { CircleCheck, CircleX, Download, Trash2, X } from '@/components/ui/Icon';
import { LiveRegion } from '@/components/ui/LiveRegion';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Toggle } from '@/components/ui/Toggle';
import { Uploader } from '@/components/kit/Uploader';
import { PassCheck, canDownload } from '@/components/kit/PassCheck';
import { loadEngine } from '@/components/kit/engine';
import { errorCode, errorMessage } from '@/components/kit/errors';
import { inputFormat, kbBucket, track } from '@/lib/analytics';
import { downloadBlob } from '@/lib/download';
import { formatKB } from '@/lib/format';
import { SettingsPanel } from '@/components/tools/SettingsPanel';
import { TargetKbPicker } from '@/components/tools/TargetKbPicker';
import {
  MAX_FILES,
  addCapped,
  baseName,
  compressFitOptions,
  compressSpec,
  fitWithDownscale,
  kbLabel,
  runBatch,
  uniqueNames,
  validateKb,
  type BatchItemState,
} from '@/components/tools/logic';

export interface ToolBatchProps {
  lang: Lang;
  dict: Dict;
}

interface Out {
  bytes: Uint8Array<ArrayBuffer>;
  sizeBytes: number;
  checks: FitCheck[];
}

interface Row {
  id: string;
  file: File;
  state: BatchItemState<Out>;
}

const TOOL = 'batch-compress';
let nextId = 1;

export default function ToolBatch({ dict }: ToolBatchProps) {
  const t = useMemo(() => createT(dict), [dict]);
  const [rows, setRows] = useState<Row[]>([]);
  const [target, setTarget] = useState<number | null>(50);
  const [keepDims, setKeepDims] = useState(false);
  const [running, setRunning] = useState(false);
  const [zipping, setZipping] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [announce, setAnnounce] = useState('');
  const stop = useRef(false);
  const invalid = target === null ? 'targetInvalid' : validateKb(target, null);

  // Settings changed after a run: results no longer match, so reset them.
  useEffect(() => {
    if (!running) setRows((rs) => rs.map((r) => ({ ...r, state: { status: 'waiting' } })));
  }, [target, keepDims]);

  const add = (files: File[]) => {
    const { list, dropped } = addCapped(
      rows,
      files.map((file) => ({ id: `b${nextId++}`, file, state: { status: 'waiting' } as BatchItemState<Out> })),
    );
    setRows(list);
    setNotice(dropped ? t('tool.batch.tooMany', { max: MAX_FILES, n: dropped }) : null);
    for (const f of files.slice(0, list.length - rows.length)) {
      track('doc_uploaded', { tool: TOOL, doc: 'other', inputFormat: inputFormat(f.type, f.name), kbBucket: kbBucket(f.size) });
    }
  };

  const names = useMemo(
    () => uniqueNames(rows.map((r) => `${baseName(r.file.name)}-${target === null ? '' : kbLabel(target)}kb.jpg`)),
    [rows, target],
  );

  const start = async () => {
    if (!rows.length || target === null || invalid) return;
    stop.current = false;
    setRunning(true);
    const spec = compressSpec(target, null);
    const opts = compressFitOptions(keepDims);
    const snapshot = rows;
    setAnnounce(t('tool.batch.started', { n: snapshot.length }));
    try {
      const engine = await loadEngine();
      const sum = await runBatch(
        snapshot,
        async (row) => {
          const img = await engine.decode(row.file);
          try {
            const { result } = await fitWithDownscale(engine, img, spec, opts);
            return { bytes: result.bytes, sizeBytes: result.sizeBytes, checks: result.checks };
          } finally {
            engine.release(img);
          }
        },
        {
          shouldStop: () => stop.current,
          onUpdate: (i, state) => {
            setRows((rs) => rs.map((r) => (r.id === snapshot[i]!.id ? { ...r, state } : r)));
            if (state.status === 'failed') track('error', { code: errorCode(state.error), tool: TOOL });
          },
        },
      );
      track('tool_used', { tool: TOOL, target: kbLabel(target) });
      setAnnounce(t('tool.batch.finished', { done: sum.done, failed: sum.failed, skipped: sum.skipped }));
    } catch (e) {
      setAnnounce(errorMessage(t, e));
    } finally {
      setRunning(false);
    }
  };

  const okRows = rows
    .map((r, i) => ({ r, name: names[i]! }))
    .filter(({ r }) => r.state.status === 'done' && r.state.result && canDownload(r.state.result.checks));
  const finished = rows.filter((r) => ['done', 'failed', 'skipped'].includes(r.state.status)).length;

  const downloadZip = async () => {
    if (!okRows.length || target === null) return;
    setZipping(true);
    try {
      const engine = await loadEngine();
      const files = okRows.map(({ r, name }) => ({ name, bytes: r.state.result!.bytes }));
      const readme = [
        `Images compressed to ${kbLabel(target)} KB with SahiSize`,
        '',
        '{{files}}',
        '',
        'Processed on your device. Never uploaded.',
      ].join('\n');
      const zip = await engine.zip(files, readme);
      downloadBlob(new Blob([zip], { type: 'application/zip' }), `images-${kbLabel(target)}kb.zip`);
      track('doc_downloaded', { tool: TOOL, doc: 'other', via: 'download' });
    } catch (e) {
      setAnnounce(errorMessage(t, e));
    } finally {
      setZipping(false);
    }
  };

  return (
    <div class="space-y-4">
      <div class="card space-y-3 p-4">
        {rows.length < MAX_FILES && !running && (
          <Uploader t={t} multiple allowPdf={false} capture={false} onFiles={add} />
        )}
        {notice && <p class="text-sm text-saffron-text">{notice}</p>}
        <p class="text-sm text-muted">{t('tool.batch.count', { n: rows.length, max: MAX_FILES })}</p>
      </div>
      <SettingsPanel title={t('tool.common.settings')}>
        <TargetKbPicker t={t} value={target} onChange={setTarget} />
        <Toggle
          label={t('tool.compress.keepDims')}
          hint={t(keepDims ? 'tool.compress.keepDimsOn' : 'tool.compress.keepDimsOff')}
          checked={keepDims}
          onChange={setKeepDims}
        />
      </SettingsPanel>
      {running ? (
        <Button variant="danger" block onClick={() => (stop.current = true)}>
          <X size={20} aria-hidden="true" />
          {t('tool.batch.stop')}
        </Button>
      ) : (
        <Button variant={okRows.length ? 'secondary' : 'primary'} block disabled={!rows.length || !!invalid} onClick={start}>
          {target !== null ? t('tool.batch.start', { n: rows.length, kb: kbLabel(target) }) : t('tool.compress.errors.targetInvalid')}
        </Button>
      )}
      {(running || finished > 0) && rows.length > 0 && (
        <ProgressBar
          value={finished}
          max={rows.length}
          label={t('tool.batch.progressLabel')}
          valueText={t('tool.common.progress', { done: finished, total: rows.length })}
        />
      )}
      {rows.length > 0 && (
        <ol class="space-y-2" aria-label={t('tool.batch.listLabel')}>
          {rows.map((r, i) => {
            const st = r.state;
            const res = st.result;
            const pass = res ? canDownload(res.checks) : false;
            return (
              <li key={r.id} class="card p-3">
                <div class="flex items-center gap-3">
                  <span class="w-6 shrink-0 text-center text-sm font-bold tabular-nums">{i + 1}</span>
                  <span class="min-w-0 flex-1 text-sm">
                    <span class="block truncate font-semibold">{r.file.name}</span>
                    <span class="block tabular-nums text-muted">
                      {formatKB(r.file.size)}
                      {res ? ` → ${formatKB(res.sizeBytes)}` : ''} · {t(`tool.batch.status.${st.status}`)}
                    </span>
                  </span>
                  {st.status === 'done' &&
                    (pass ? (
                      <CircleCheck size={22} aria-hidden="true" class="shrink-0 text-success" />
                    ) : (
                      <CircleX size={22} aria-hidden="true" class="shrink-0 text-error" />
                    ))}
                  {st.status === 'done' && res && pass && (
                    <button
                      type="button"
                      class="inline-flex h-tap w-tap items-center justify-center rounded-card border border-border-strong"
                      aria-label={t('tool.batch.downloadOne', { n: i + 1 })}
                      onClick={() => {
                        downloadBlob(new Blob([res.bytes], { type: 'image/jpeg' }), names[i]!);
                        track('doc_downloaded', { tool: TOOL, doc: 'other', via: 'download' });
                      }}
                    >
                      <Download size={20} aria-hidden="true" />
                    </button>
                  )}
                  {!running && (
                    <button
                      type="button"
                      class="inline-flex h-tap w-tap items-center justify-center rounded-card border border-error text-error-text"
                      aria-label={t('tool.list.removeFile', { n: i + 1 })}
                      onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))}
                    >
                      <Trash2 size={18} aria-hidden="true" />
                    </button>
                  )}
                </div>
                {st.status === 'failed' && (
                  <p class="mt-2 text-sm text-error-text" role="alert">
                    {errorMessage(t, st.error)}
                  </p>
                )}
                {res && (
                  <details class="mt-2 text-sm">
                    <summary class="min-h-tap cursor-pointer py-3 font-semibold text-primary">{t('tool.batch.showChecks')}</summary>
                    <PassCheck t={t} checks={res.checks} />
                  </details>
                )}
              </li>
            );
          })}
        </ol>
      )}
      {okRows.length > 0 && !running && (
        <div class="sticky bottom-0 z-10 -mx-4 border-t border-border bg-bg/95 px-4 py-3 sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
          <Button variant="primary" block busy={zipping} onClick={downloadZip}>
            <Download size={20} aria-hidden="true" />
            {t('tool.batch.zip', { n: okRows.length })}
          </Button>
        </div>
      )}
      <LiveRegion message={announce} />
    </div>
  );
}
