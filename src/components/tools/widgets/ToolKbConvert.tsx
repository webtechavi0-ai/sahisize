'use client';
/**
 * Photo size converter in KB: pick any target KB and the file goes DOWN or UP to land in
 * [max(minimum, 90% of target), target]. Mounted by /tools/photo-size-converter-in-kb.
 *
 * No new codec: the spec is compressSpec() (the compress tool's), and the engine's own fit()
 * raises a file that is under the floor the same way the increase tool does (higher quality,
 * then invisible grain, then COM padding). kb-convert.ts only picks the direction and options:
 * reducing may shrink the pixels (unless "keep width and height" is on); increasing never does.
 */
import { useEffect, useMemo, useState } from 'react';
import type { Lang } from '@/i18n/config';
import { createT, type Dict } from '@/i18n/core';
import { Toggle } from '@/components/ui/Toggle';
import { LiveRegion } from '@/components/ui/LiveRegion';
import { loadEngine } from '@/components/kit/engine';
import { errorCode, errorMessage } from '@/components/kit/errors';
import { canDownload, passSummary } from '@/components/kit/PassCheck';
import { track } from '@/lib/analytics';
import { formatKB } from '@/lib/format';
import { FieldError, NumberField } from '@/components/tools/SettingsPanel';
import { TargetKbPicker } from '@/components/tools/TargetKbPicker';
import { SourceBar } from '@/components/tools/SourceBar';
import { ResultPanel, type ToolOutput } from '@/components/tools/ResultPanel';
import { useToolImage } from '@/components/tools/useToolImage';
import { useDebounced, useRun } from '@/components/tools/useRun';
import { ErrorBox, MoreOptions, Working, type FixAction } from '@/components/tools/Flow';
import { ToolColumns } from '@/components/tools/ToolColumns';
import { baseName, compressSpec, fitWithDownscale, kbLabel, validateKb } from '@/components/tools/logic';
import {
  CONVERT_KB_PRESETS,
  convertFitOptions,
  convertFloorKB,
  convertMayDownscale,
  kbDirection,
  type KbDirection,
} from '@/components/tools/kb-convert';

export interface ToolKbConvertProps {
  lang: Lang;
  dict: Dict;
  /** Starting target in KB. */
  initialKB?: number;
}

const TOOL = 'photo-size-converter-in-kb';

export default function ToolKbConvert({ dict, initialKB = 50 }: ToolKbConvertProps) {
  const t = useMemo(() => createT(dict), [dict]);
  const [target, setTarget] = useState<number | null>(initialKB);
  const [minKB, setMinKB] = useState<number | null>(null);
  const [keepDims, setKeepDims] = useState(false);
  const [announce, setAnnounce] = useState('');
  const src = useToolImage(TOOL);
  const job = useRun<ToolOutput>();

  const invalid = target === null ? 'targetInvalid' : validateKb(target, minKB);
  const lo = target !== null && !invalid ? convertFloorKB(target, minKB) : null;
  const dir: KbDirection | null =
    src.image && target !== null && !invalid ? kbDirection(src.image.file.size, target, minKB) : null;

  const convert = () => {
    const image = src.image;
    if (!image || target === null || invalid) return;
    const d = kbDirection(image.file.size, target, minKB);
    const spec = compressSpec(target, minKB);
    setAnnounce(t(`tool.kbConvert.working.${d}`, { kb: kbLabel(target) }));
    void job
      .run(async () => {
        const engine = await loadEngine();
        const t0 = performance.now();
        const opts = convertFitOptions(d, keepDims);
        const { result, scaled } = convertMayDownscale(d, keepDims)
          ? await fitWithDownscale(engine, image.img, spec, opts)
          : { result: await engine.fit(image.img, spec, opts), scaled: false };
        track('fit_done', {
          tool: TOOL,
          doc: 'other',
          pass: canDownload(result.checks),
          stages: result.stages,
          ms: Math.round(performance.now() - t0),
        });
        track('tool_used', { tool: TOOL, target: `${d}-${kbLabel(target)}` });
        setAnnounce(
          `${t('tool.common.resultReady', { kb: formatKB(result.sizeBytes) })} ${passSummary(t, result.checks)}`,
        );
        return {
          blob: new Blob([result.bytes], { type: 'image/jpeg' }),
          fileName: `${baseName(image.file.name)}-${kbLabel(target)}kb.jpg`,
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

  const later = useDebounced(convert, 450);
  useEffect(() => {
    if (src.image) later();
  }, [src.image, target, minKB, keepDims]);

  useEffect(() => {
    if (job.error) {
      track('error', { code: errorCode(job.error), tool: TOOL });
      setAnnounce(errorMessage(t, job.error));
    }
  }, [job.error]);

  const again = () => {
    job.clear();
    src.reset();
  };

  const goal =
    target === null || invalid || lo === null
      ? undefined
      : t('tool.kbConvert.goal', { min: kbLabel(lo), max: kbLabel(target) });

  const fixes: FixAction[] = [];
  if (job.error) {
    if (keepDims && dir !== 'increase' && errorCode(job.error) === 'TOO_DETAILED')
      fixes.push({ label: t('tool.flow.letShrink'), onClick: () => setKeepDims(false), primary: true });
    else fixes.push({ label: t('tool.flow.retry'), onClick: convert, primary: true });
    fixes.push({ label: t('tool.flow.otherPhoto'), onClick: again });
  }

  const sizeError =
    invalid && (target !== null || src.image) ? t(`tool.compress.errors.${invalid}`) : null;

  return (
    <ToolColumns
      empty={t('tool.common.resultEmpty')}
      active={job.busy || !!job.error || !!job.result}
      input={
        <>
          <div className="card space-y-3 p-4" data-kb-convert-target>
            <TargetKbPicker
              t={t}
              value={target}
              onChange={setTarget}
              presets={CONVERT_KB_PRESETS}
              label={t('tool.kbConvert.target')}
            />
            <FieldError message={sizeError} />
          </div>
          <SourceBar
            t={t}
            image={src.image}
            loading={src.loading}
            error={src.error}
            goal={goal}
            onFile={(f) => {
              job.clear();
              void src.load(f);
            }}
            onReset={again}
          />
          {src.image && dir && target !== null && lo !== null && (
            <p className="rounded-card border border-rule bg-band p-3 text-sm" data-kb-direction={dir}>
              {t(`tool.kbConvert.direction.${dir}`, {
                from: formatKB(src.image.file.size),
                min: kbLabel(lo),
                max: kbLabel(target),
              })}
            </p>
          )}
        </>
      }
      output={
        <>
          {job.busy && (
            <Working
              label={
                target !== null && dir
                  ? t(`tool.kbConvert.working.${dir}`, { kb: kbLabel(target) })
                  : t('tool.common.working')
              }
            />
          )}
          {!job.busy && job.error && (
            <ErrorBox
              message={errorMessage(t, job.error)}
              hint={keepDims && dir !== 'increase' ? t('tool.compress.tryDownscale') : undefined}
              actions={fixes}
            />
          )}
          {!job.busy && job.result && target !== null && (
            <ResultPanel
              t={t}
              tool={TOOL}
              output={job.result}
              before={src.image?.file}
              meter={{ minKB: lo, maxKB: target }}
              onAgain={again}
            />
          )}
        </>
      }
      settings={
        <MoreOptions title={t('tool.flow.moreOptions')} hint={t('tool.flow.moreOptionsHint')}>
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
            hint={t(keepDims ? 'tool.compress.keepDimsOn' : 'tool.kbConvert.keepDimsOff')}
            checked={keepDims}
            onChange={setKeepDims}
          />
          {lo !== null && target !== null && (
            <p className="text-sm text-muted">
              {t('tool.compress.willLand', { min: kbLabel(lo), max: kbLabel(target) })}
            </p>
          )}
          <p className="text-sm text-muted">{t('tool.kbConvert.how')}</p>
        </MoreOptions>
      }
      footer={<LiveRegion message={announce} />}
    />
  );
}
