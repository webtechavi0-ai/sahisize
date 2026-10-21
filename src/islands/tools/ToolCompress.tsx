/**
 * T1 Compress to X KB (SPEC 5.2): presets 10–500 KB + custom, optional minimum,
 * keep dimensions vs allow downscale. Output lands in [target − 10%, target].
 * Mounted by /tools/compress-image and /tools/compress-image-to-[n]kb (+ Hindi).
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import type { Lang } from '@/config/site';
import { createT, type Dict } from '@/i18n/core';
import { Toggle } from '@/components/ui/Toggle';
import { LiveRegion } from '@/components/ui/LiveRegion';
import { loadEngine } from '@/components/kit/engine';
import { errorCode, errorMessage } from '@/components/kit/errors';
import { canDownload, passSummary } from '@/components/kit/PassCheck';
import { track } from '@/lib/analytics';
import { formatKB } from '@/lib/format';
import { FieldError, NumberField, SettingsPanel } from '@/components/tools/SettingsPanel';
import { TargetKbPicker } from '@/components/tools/TargetKbPicker';
import { SourceBar } from '@/components/tools/SourceBar';
import { ResultPanel, type ToolOutput } from '@/components/tools/ResultPanel';
import { useToolImage } from '@/components/tools/useToolImage';
import { useDebounced, useRun } from '@/components/tools/useRun';
import {
  baseName,
  compressFitOptions,
  compressSpec,
  fitWithDownscale,
  kbLabel,
  lowerBoundKB,
  validateKb,
} from '@/components/tools/logic';
import { Skeleton } from '@/components/ui/Skeleton';

export interface ToolCompressProps {
  lang: Lang;
  dict: Dict;
  /** Pre-set target (compress-image-to-[n]kb pages). */
  initialKB?: number | null;
}

const TOOL = 'compress-image';

export default function ToolCompress({ dict, initialKB = 50 }: ToolCompressProps) {
  const t = useMemo(() => createT(dict), [dict]);
  const [target, setTarget] = useState<number | null>(initialKB);
  const [minKB, setMinKB] = useState<number | null>(null);
  const [keepDims, setKeepDims] = useState(false);
  const [announce, setAnnounce] = useState('');
  const src = useToolImage(TOOL);
  const job = useRun<ToolOutput>();

  const invalid = target === null ? 'targetInvalid' : validateKb(target, minKB);

  const compress = () => {
    const image = src.image;
    if (!image || target === null || invalid) return;
    const spec = compressSpec(target, minKB);
    setAnnounce(t('tool.compress.working', { kb: kbLabel(target) }));
    void job
      .run(async () => {
        const engine = await loadEngine();
        const t0 = performance.now();
        const { result, scaled } = await fitWithDownscale(engine, image.img, spec, compressFitOptions(keepDims));
        const out: ToolOutput = {
          blob: new Blob([result.bytes], { type: 'image/jpeg' }),
          fileName: `${baseName(image.file.name)}-${kbLabel(target)}kb.jpg`,
          sizeBytes: result.sizeBytes,
          checks: result.checks,
          width: result.widthPx,
          height: result.heightPx,
          warnings: scaled && !result.warnings?.includes('DOWNSCALED') ? [...(result.warnings ?? []), 'DOWNSCALED'] : result.warnings,
        };
        track('fit_done', { tool: TOOL, doc: 'other', pass: canDownload(result.checks), stages: result.stages, ms: Math.round(performance.now() - t0) });
        track('tool_used', { tool: TOOL, target: kbLabel(target) });
        setAnnounce(`${t('tool.common.resultReady', { kb: formatKB(result.sizeBytes) })} ${passSummary(t, result.checks)}`);
        return out;
      })
      .then((r) => {
        if (!r) setAnnounce('');
      });
  };

  const later = useDebounced(compress, 450);
  useEffect(() => {
    if (src.image) later();
  }, [src.image, target, minKB, keepDims]);

  useEffect(() => {
    if (job.error) {
      track('error', { code: errorCode(job.error), tool: TOOL });
      setAnnounce(errorMessage(t, job.error));
    }
  }, [job.error]);

  const lo = target !== null && !invalid ? Math.max(minKB ?? 0, lowerBoundKB(target)) : null;

  return (
    <div class="space-y-4">
      <SourceBar
        t={t}
        image={src.image}
        loading={src.loading}
        error={src.error}
        onFile={(f) => {
          job.clear();
          void src.load(f);
        }}
        onReset={() => {
          job.clear();
          src.reset();
        }}
      />
      <SettingsPanel title={t('tool.common.settings')}>
        <TargetKbPicker t={t} value={target} onChange={setTarget} />
        <NumberField
          label={t('tool.compress.minKb')}
          suffix="KB"
          value={minKB}
          min={0}
          step="any"
          onChange={setMinKB}
          placeholder={t('tool.common.optional')}
          hint={t('tool.compress.minKbHint')}
          invalid={invalid === 'minInvalid' || invalid === 'minAboveMax'}
        />
        <Toggle
          label={t('tool.compress.keepDims')}
          hint={t(keepDims ? 'tool.compress.keepDimsOn' : 'tool.compress.keepDimsOff')}
          checked={keepDims}
          onChange={setKeepDims}
        />
        {lo !== null && target !== null && (
          <p class="text-sm text-muted">{t('tool.compress.willLand', { min: kbLabel(lo), max: kbLabel(target) })}</p>
        )}
        <FieldError message={invalid && (target !== null || src.image) ? t(`tool.compress.errors.${invalid}`) : null} />
      </SettingsPanel>
      {job.busy && <Skeleton class="h-48 w-full" label={t('tool.common.working')} />}
      {!job.busy && job.error && (
        <p role="alert" class="rounded-card border border-error p-3 text-sm text-error-text">
          {errorMessage(t, job.error)}
          {!keepDims ? null : <span class="block pt-1">{t('tool.compress.tryDownscale')}</span>}
        </p>
      )}
      {!job.busy && job.result && target !== null && (
        <ResultPanel
          t={t}
          tool={TOOL}
          output={job.result}
          before={src.image?.file}
          meter={{ minKB: lo, maxKB: target }}
        />
      )}
      <LiveRegion message={announce} />
    </div>
  );
}
