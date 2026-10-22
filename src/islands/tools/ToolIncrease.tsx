/**
 * Increase image size in KB: raise a photo or signature to at least a minimum KB (and at
 * most a maximum) without changing how it looks. Pixels stay the same size by default.
 * The engine's fit() does the work: higher JPEG quality first, then invisible grain, then
 * COM padding (SPEC 7.3 steps 3–4, Q26 window). Mounted by /tools/increase-image-size-in-kb (+ Hindi).
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import type { Lang } from '@/config/site';
import { createT, type Dict } from '@/i18n/core';
import { Toggle } from '@/components/ui/Toggle';
import { LiveRegion } from '@/components/ui/LiveRegion';
import { Skeleton } from '@/components/ui/Skeleton';
import { loadEngine } from '@/components/kit/engine';
import { errorCode, errorMessage } from '@/components/kit/errors';
import { canDownload, passSummary } from '@/components/kit/PassCheck';
import { track } from '@/lib/analytics';
import { formatKB } from '@/lib/format';
import { FieldError, NumberField, SettingsPanel } from '@/components/tools/SettingsPanel';
import { TargetKbPicker } from '@/components/tools/TargetKbPicker';
import { SourceBar } from '@/components/tools/SourceBar';
import { ResultPanel, type ToolOutput } from '@/components/tools/ResultPanel';
import { ToolColumns } from '@/components/tools/ToolColumns';
import { useToolImage } from '@/components/tools/useToolImage';
import { useDebounced, useRun } from '@/components/tools/useRun';
import { baseName, fitWithDownscale, kbLabel } from '@/components/tools/logic';
import {
  INCREASE_MIN_PRESETS,
  MIN_INCREASE_KB,
  alreadyAboveMin,
  defaultMaxKB,
  increaseFitOptions,
  increaseSpec,
  increaseTarget,
  validateIncrease,
} from '@/components/tools/increase';

export interface ToolIncreaseProps {
  lang: Lang;
  dict: Dict;
  initialMinKB?: number;
}

const TOOL = 'increase-image-size-in-kb';

export default function ToolIncrease({ dict, initialMinKB = 20 }: ToolIncreaseProps) {
  const t = useMemo(() => createT(dict), [dict]);
  const [minKB, setMinKB] = useState<number | null>(initialMinKB);
  const [maxKB, setMaxKB] = useState<number | null>(defaultMaxKB(initialMinKB));
  const [keepPixels, setKeepPixels] = useState(true);
  const [announce, setAnnounce] = useState('');
  const src = useToolImage(TOOL);
  const job = useRun<ToolOutput>();

  const invalid = validateIncrease(minKB, maxKB);

  const pickMin = (v: number | null) => {
    setMinKB(v);
    // A preset chip also resets the maximum to that chip's common range.
    if (v !== null && (INCREASE_MIN_PRESETS as readonly number[]).includes(v)) setMaxKB(defaultMaxKB(v));
  };

  const run = () => {
    const image = src.image;
    if (!image || minKB === null || maxKB === null || invalid) return;
    const spec = increaseSpec(minKB, maxKB);
    setAnnounce(t('tool.increase.working', { kb: kbLabel(minKB) }));
    void job
      .run(async () => {
        const engine = await loadEngine();
        const t0 = performance.now();
        const opts = increaseFitOptions(keepPixels);
        const { result, scaled } = keepPixels
          ? { result: await engine.fit(image.img, spec, opts), scaled: false }
          : await fitWithDownscale(engine, image.img, spec, opts);
        track('fit_done', { tool: TOOL, doc: 'other', pass: canDownload(result.checks), stages: result.stages, ms: Math.round(performance.now() - t0) });
        track('tool_used', { tool: TOOL, target: increaseTarget(minKB, maxKB) });
        setAnnounce(`${t('tool.common.resultReady', { kb: formatKB(result.sizeBytes) })} ${passSummary(t, result.checks)}`);
        return {
          blob: new Blob([result.bytes], { type: 'image/jpeg' }),
          fileName: `${baseName(image.file.name)}-${kbLabel(minKB)}kb.jpg`,
          sizeBytes: result.sizeBytes,
          checks: result.checks,
          width: result.widthPx,
          height: result.heightPx,
          warnings:
            scaled && !result.warnings?.includes('DOWNSCALED')
              ? [...(result.warnings ?? []), 'DOWNSCALED']
              : result.warnings,
        };
      })
      .then((r) => {
        if (!r) setAnnounce('');
      });
  };

  const later = useDebounced(run, 450);
  useEffect(() => {
    if (src.image) later();
  }, [src.image, minKB, maxKB, keepPixels]);

  useEffect(() => {
    if (job.error) {
      track('error', { code: errorCode(job.error), tool: TOOL });
      setAnnounce(errorMessage(t, job.error));
    }
  }, [job.error]);

  const above = src.image && minKB !== null && !invalid && alreadyAboveMin(src.image.file.size, minKB);

  return (
    <ToolColumns
      empty={t('tool.common.resultEmpty')}
      active={job.busy || !!job.error || !!job.result}
      input={
        <>
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
            <TargetKbPicker
              t={t}
              value={minKB}
              onChange={pickMin}
              presets={INCREASE_MIN_PRESETS}
              label={t('tool.increase.minKb')}
            />
            <NumberField
              label={t('tool.increase.maxKb')}
              suffix="KB"
              value={maxKB}
              min={MIN_INCREASE_KB}
              step="any"
              onChange={setMaxKB}
              hint={t('tool.increase.maxKbHint')}
              invalid={invalid === 'maxInvalid' || invalid === 'maxBelowMin'}
            />
            <Toggle
              label={t('tool.increase.keepPixels')}
              hint={t(keepPixels ? 'tool.increase.keepPixelsOn' : 'tool.increase.keepPixelsOff')}
              checked={keepPixels}
              onChange={setKeepPixels}
            />
            {!invalid && minKB !== null && maxKB !== null && (
              <p class="text-sm text-muted">{t('tool.increase.willLand', { min: kbLabel(minKB), max: kbLabel(maxKB) })}</p>
            )}
            <p class="text-sm text-muted">{t('tool.increase.how')}</p>
            {above && src.image && minKB !== null && (
              <p class="rounded-card border border-rule bg-paper p-3 text-sm">
                {t('tool.increase.already', { kb: formatKB(src.image.file.size), min: kbLabel(minKB) })}
              </p>
            )}
            <FieldError message={invalid ? t(`tool.increase.errors.${invalid}`) : null} />
          </SettingsPanel>
        </>
      }
      output={
        <>
          {job.busy && <Skeleton class="h-48 w-full" label={t('tool.common.working')} />}
          {!job.busy && job.error && (
            <p role="alert" class="rounded-card border border-error p-3 text-sm text-error-text">
              {errorMessage(t, job.error)}
              {keepPixels && <span class="block pt-1">{t('tool.increase.tryShrink')}</span>}
            </p>
          )}
          {!job.busy && job.result && minKB !== null && maxKB !== null && (
            <ResultPanel
              t={t}
              tool={TOOL}
              output={job.result}
              before={src.image?.file}
              meter={{ minKB, maxKB }}
            />
          )}
        </>
      }
      footer={<LiveRegion message={announce} />}
    />
  );
}
