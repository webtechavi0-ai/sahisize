/**
 * T1 Compress to X KB (SPEC 5.2): presets 10–500 KB + custom, optional minimum,
 * keep dimensions vs allow downscale. Output lands in [target − 10%, target].
 * Mounted by /tools/compress-image and /tools/compress-image-to-[n]kb (+ Hindi).
 *
 * Flow: the page already knows the target, so the empty state is just the upload buttons
 * under "We'll make your photo 20 KB." The fit starts as soon as a photo is picked; the
 * size, minimum and keep-dimensions options live under one collapsed "More options".
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
import { FieldError, NumberField } from '@/components/tools/SettingsPanel';
import { TargetKbPicker } from '@/components/tools/TargetKbPicker';
import { SourceBar } from '@/components/tools/SourceBar';
import { ResultPanel, type ToolOutput } from '@/components/tools/ResultPanel';
import { useToolImage } from '@/components/tools/useToolImage';
import { useDebounced, useRun } from '@/components/tools/useRun';
import { ErrorBox, MoreOptions, Working, type FixAction } from '@/components/tools/Flow';
import {
  baseName,
  compressFitOptions,
  compressSpec,
  fitWithDownscale,
  kbLabel,
  lowerBoundKB,
  validateKb,
} from '@/components/tools/logic';
import { ToolColumns } from '@/components/tools/ToolColumns';

export interface ToolCompressProps {
  lang: Lang;
  dict: Dict;
  /** Pre-set target (compress-image-to-[n]kb pages). */
  initialKB?: number | null;
  /** Pre-set minimum (KB-range pages such as compress-image-20kb-to-50kb). */
  initialMinKB?: number | null;
  /** Generic page with no size in its URL: show the size chips before the upload. */
  askSize?: boolean;
}

const TOOL = 'compress-image';

export default function ToolCompress({ dict, initialKB = 50, initialMinKB = null, askSize = false }: ToolCompressProps) {
  const t = useMemo(() => createT(dict), [dict]);
  const [target, setTarget] = useState<number | null>(initialKB);
  const [minKB, setMinKB] = useState<number | null>(initialMinKB);
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
  const again = () => {
    job.clear();
    src.reset();
  };
  const goal =
    target === null || invalid
      ? undefined
      : minKB
        ? t('tool.flow.goalRange', { min: kbLabel(minKB), max: kbLabel(target) })
        : t('tool.flow.goalPhoto', { kb: kbLabel(target) });

  const fixes: FixAction[] = [];
  if (job.error) {
    if (keepDims && errorCode(job.error) === 'TOO_DETAILED')
      fixes.push({ label: t('tool.flow.letShrink'), onClick: () => setKeepDims(false), primary: true });
    else fixes.push({ label: t('tool.flow.retry'), onClick: compress, primary: true });
    fixes.push({ label: t('tool.flow.otherPhoto'), onClick: again });
  }

  const sizeError = invalid && (target !== null || src.image) ? t(`tool.compress.errors.${invalid}`) : null;
  const sizePicker = <TargetKbPicker t={t} value={target} onChange={setTarget} />;

  return (
    <ToolColumns
      empty={t('tool.common.resultEmpty')}
      active={job.busy || !!job.error || !!job.result}
      input={<>
      {askSize && !src.image && <div class="card p-4">{sizePicker}</div>}
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
      </>}
      output={<>
      {job.busy && <Working label={target !== null ? t('tool.compress.working', { kb: kbLabel(target) }) : t('tool.common.working')} />}
      {!job.busy && job.error && (
        <ErrorBox
          message={errorMessage(t, job.error)}
          hint={keepDims ? t('tool.compress.tryDownscale') : undefined}
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
      </>}
      settings={
        <MoreOptions
          title={t('tool.flow.moreOptions')}
          hint={target !== null && !invalid ? t('tool.flow.changeSizeHint', { kb: kbLabel(target) }) : t('tool.flow.moreOptionsHint')}
          open={sizeError ? true : undefined}
        >
          {(!askSize || src.image) && sizePicker}
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
          <FieldError message={sizeError} />
        </MoreOptions>
      }
      footer={<LiveRegion message={announce} />}
    />
  );
}
