/**
 * T10 Custom preset (SPEC 5.2): any width, height, min KB, max KB, DPI and format, with a
 * shareable URL (?w=200&h=230&min=20&max=50&dpi=200&fmt=jpg). The page is noindex; the
 * query is read on the client after hydration and kept in sync with replaceState.
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Lang } from '@/config/site';
import { createT, type Dict } from '@/i18n/core';
import { cropAspect } from '@/engine/types';
import { Button } from '@/components/ui/Button';
import { Check, Share2 } from '@/components/ui/Icon';
import { LiveRegion } from '@/components/ui/LiveRegion';
import { Skeleton } from '@/components/ui/Skeleton';
import { Cropper } from '@/components/kit/Cropper';
import { defaultCropState, engineCropArgs } from '@/components/kit/crop-math';
import { loadEngine } from '@/components/kit/engine';
import { errorCode, errorMessage } from '@/components/kit/errors';
import { canDownload, passSummary } from '@/components/kit/PassCheck';
import type { CropState } from '@/lib/kit-store';
import { track } from '@/lib/analytics';
import { formatKB } from '@/lib/format';
import { Choice, FieldError, NumberField, SettingsPanel, inputClass } from '@/components/tools/SettingsPanel';
import { SourceBar } from '@/components/tools/SourceBar';
import { ResultPanel, type ToolOutput } from '@/components/tools/ResultPanel';
import { useToolImage } from '@/components/tools/useToolImage';
import { useDebounced, useRun } from '@/components/tools/useRun';
import {
  DEFAULT_CUSTOM,
  buildCustomQuery,
  customErrors,
  customSpec,
  parseCustomQuery,
  specTarget,
  type CustomSettings,
} from '@/components/tools/logic';

export interface ToolCustomPresetProps {
  lang: Lang;
  dict: Dict;
}

const TOOL = 'custom-preset';

export default function ToolCustomPreset({ dict }: ToolCustomPresetProps) {
  const t = useMemo(() => createT(dict), [dict]);
  const [s, setS] = useState<CustomSettings>(DEFAULT_CUSTOM);
  const [ready, setReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const [announce, setAnnounce] = useState('');
  const crop = useRef<CropState | null>(null);
  const src = useToolImage(TOOL);
  const job = useRun<ToolOutput>();

  useEffect(() => {
    setS(parseCustomQuery(location.search));
    setReady(true);
  }, []);

  const errs = customErrors(s);
  const spec = errs.length ? null : customSpec(s);
  const aspect = spec ? cropAspect(spec) : null;
  const query = buildCustomQuery(s);
  const shareUrl = typeof location !== 'undefined' ? `${location.origin}${location.pathname}${query}` : query;

  useEffect(() => {
    if (!ready || errs.length) return;
    try {
      history.replaceState(history.state, '', `${location.pathname}${query}`);
    } catch {
      /* sandboxed */
    }
    setCopied(false);
  }, [query, ready]);

  const set = (patch: Partial<CustomSettings>) => setS((p) => ({ ...p, ...patch }));

  const fitNow = () => {
    const image = src.image;
    if (!image || !spec) return;
    setAnnounce(t('tool.custom.working'));
    void job.run(async () => {
      const engine = await loadEngine();
      const t0 = performance.now();
      const state = crop.current ?? defaultCropState(image.img.width, image.img.height, aspect);
      const args = engineCropArgs(state, image.img.width, image.img.height);
      const img = await engine.crop(image.img, args.rect, args.rotationDeg, args.flip);
      try {
        const res = await engine.fit(img, spec);
        track('fit_done', { tool: TOOL, doc: 'other', pass: canDownload(res.checks), stages: res.stages, ms: Math.round(performance.now() - t0) });
        track('tool_used', { tool: TOOL, target: specTarget(spec) });
        setAnnounce(`${t('tool.common.resultReady', { kb: formatKB(res.sizeBytes) })} ${passSummary(t, res.checks)}`);
        return {
          blob: new Blob([res.bytes], { type: res.format === 'png' ? 'image/png' : 'image/jpeg' }),
          fileName: spec.fileName,
          sizeBytes: res.sizeBytes,
          checks: res.checks,
          width: res.widthPx,
          height: res.heightPx,
          warnings: res.warnings,
        };
      } finally {
        engine.release(img);
      }
    });
  };

  const fitted = job.result !== null;
  const later = useDebounced(fitNow, 500);
  useEffect(() => {
    if (fitted && src.image && spec) later();
  }, [query]);

  useEffect(() => {
    if (job.error) {
      track('error', { code: errorCode(job.error), tool: TOOL });
      setAnnounce(errorMessage(t, job.error));
    }
  }, [job.error]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setAnnounce(t('tool.custom.copied'));
    } catch {
      setCopied(false);
    }
  };

  return (
    <div class="space-y-4">
      <SettingsPanel title={t('tool.custom.rules')}>
        <div class="grid grid-cols-2 gap-3">
          <NumberField
            label={t('tool.resize.width')}
            suffix="px"
            value={s.w}
            min={1}
            placeholder={t('tool.common.optional')}
            onChange={(w) => set({ w: w === null ? null : Math.round(w) })}
            invalid={errs.includes('dims')}
          />
          <NumberField
            label={t('tool.resize.height')}
            suffix="px"
            value={s.h}
            min={1}
            placeholder={t('tool.common.optional')}
            onChange={(h) => set({ h: h === null ? null : Math.round(h) })}
            invalid={errs.includes('dims')}
          />
          <NumberField
            label={t('tool.common.minKb')}
            suffix="KB"
            value={s.minKB}
            min={0}
            step="any"
            placeholder={t('tool.common.optional')}
            onChange={(minKB) => set({ minKB })}
            invalid={errs.includes('kb')}
          />
          <NumberField
            label={t('tool.common.maxKb')}
            suffix="KB"
            value={Number.isFinite(s.maxKB) ? s.maxKB : null}
            min={1}
            step="any"
            onChange={(maxKB) => set({ maxKB: maxKB ?? Number.NaN })}
            invalid={errs.includes('kb')}
          />
        </div>
        <NumberField
          label={t('tool.resize.dpi')}
          suffix="DPI"
          value={s.dpi}
          min={50}
          max={1200}
          placeholder={t('tool.common.optional')}
          onChange={(dpi) => set({ dpi: dpi === null ? null : Math.round(dpi) })}
          invalid={errs.includes('dpi')}
        />
        <Choice
          label={t('tool.common.format')}
          value={s.format}
          options={[
            { value: 'jpg', label: 'JPG' },
            { value: 'png', label: 'PNG' },
          ]}
          onChange={(format) => set({ format })}
        />
        <FieldError message={errs.length ? errs.map((e) => t(`tool.custom.errors.${e}`)).join(' ') : null} />
        <div class="space-y-2 border-t border-border pt-3">
          <label class="block" for="custom-share">
            <span class="text-sm font-semibold">{t('tool.custom.shareLabel')}</span>
            <input id="custom-share" class={inputClass} readOnly value={shareUrl} onFocus={(e) => e.currentTarget.select()} />
          </label>
          <Button block onClick={copy} disabled={errs.length > 0}>
            {copied ? <Check size={20} aria-hidden="true" /> : <Share2 size={20} aria-hidden="true" />}
            {copied ? t('tool.custom.copied') : t('tool.custom.copy')}
          </Button>
        </div>
      </SettingsPanel>
      <SourceBar
        t={t}
        image={src.image}
        loading={src.loading}
        error={src.error}
        allowPdf
        onFile={(f) => {
          job.clear();
          crop.current = null;
          void src.load(f);
        }}
        onReset={() => {
          job.clear();
          crop.current = null;
          src.reset();
        }}
      />
      {src.image && (
        <section class="card space-y-3 p-4" aria-labelledby="custom-crop-h">
          <h2 id="custom-crop-h" class="text-lg font-bold">
            {t('tool.ink.cropTitle')}
          </h2>
          <Cropper
            key={`${src.image.src}|${aspect ?? 'free'}`}
            t={t}
            src={src.image.src}
            width={src.image.img.width}
            height={src.image.img.height}
            aspect={aspect}
            guide="none"
            onChange={(c) => {
              crop.current = c;
            }}
          />
          <Button variant={fitted ? 'secondary' : 'primary'} block busy={job.busy} disabled={!spec} onClick={fitNow}>
            {fitted ? t('tool.ink.refit') : t('common.actions.autoFit')}
          </Button>
        </section>
      )}
      {job.busy && <Skeleton class="h-48 w-full" label={t('tool.common.working')} />}
      {!job.busy && job.error && (
        <p role="alert" class="rounded-card border border-error p-3 text-sm text-error-text">
          {errorMessage(t, job.error)}
        </p>
      )}
      {!job.busy && job.result && spec && (
        <ResultPanel t={t} tool={TOOL} output={job.result} before={src.image?.file} meter={{ minKB: spec.minKB, maxKB: spec.maxKB }} />
      )}
      <LiveRegion message={announce} />
    </div>
  );
}
