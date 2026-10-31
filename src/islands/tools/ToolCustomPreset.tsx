'use client';
/**
 * T10 Custom preset (SPEC 5.2): any width, height, min KB, max KB, DPI and format, with a
 * shareable URL (?w=200&h=230&min=20&max=50&dpi=200&fmt=jpg). The page is noindex; the
 * query is read on the client after hydration and kept in sync with replaceState.
 * Flow: width, height and maximum KB up front; the fit starts as soon as a photo is picked
 * and re-runs on any change. Minimum KB, DPI, format, the share link and the crop sit
 * under "More options".
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Lang } from '@/config/site';
import { createT, type Dict } from '@/i18n/core';
import { cropAspect } from '@/engine/types';
import { Button } from '@/components/ui/Button';
import { Check, Share2 } from '@/components/ui/Icon';
import { LiveRegion } from '@/components/ui/LiveRegion';
import { Cropper } from '@/components/kit/Cropper';
import { defaultCropState, engineCropArgs } from '@/components/kit/crop-math';
import { loadEngine } from '@/components/kit/engine';
import { errorCode, errorMessage } from '@/components/kit/errors';
import { canDownload, passSummary } from '@/components/kit/PassCheck';
import type { CropState } from '@/lib/kit-store';
import { track } from '@/lib/analytics';
import { formatKB } from '@/lib/format';
import { Choice, FieldError, NumberField, SettingsPanel, inputClass } from '@/components/tools/SettingsPanel';
import { ErrorBox, MoreOptions, Working, type FixAction } from '@/components/tools/Flow';
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
import { ToolColumns } from '@/components/tools/ToolColumns';

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
  const [adjust, setAdjust] = useState(false);
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

  // Fit as soon as a photo is in, and again after any change to the rules.
  const later = useDebounced(fitNow, 450);
  useEffect(() => {
    if (src.image && spec) later();
  }, [src.image, query]);

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

  const again = () => {
    job.clear();
    crop.current = null;
    setAdjust(false);
    src.reset();
  };
  const fixes: FixAction[] = [];
  if (job.error) {
    if (errorCode(job.error) === 'TOO_DETAILED' && !adjust)
      fixes.push({ label: t('tool.flow.adjustCrop'), onClick: () => setAdjust(true), primary: true });
    else fixes.push({ label: t('tool.flow.retry'), onClick: fitNow, primary: true });
    fixes.push({ label: t('tool.flow.otherPhoto'), onClick: again });
  }
  const ruleText = spec
    ? [
        s.w !== null && s.h !== null ? t('common.units.px', { w: s.w, h: s.h }) : null,
        s.minKB ? t('common.units.kbRange', { min: s.minKB, max: s.maxKB }) : t('common.units.kbMax', { max: s.maxKB }),
        s.format.toUpperCase(),
      ]
        .filter(Boolean)
        .join(', ')
    : null;

  return (
    <ToolColumns
      empty={t('tool.common.resultEmpty')}
      active={job.busy || !!job.error || !!job.result}
      input={
        <>
          <SettingsPanel title={t('tool.custom.rules')}>
            <div className="grid grid-cols-2 gap-3">
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
            </div>
            <NumberField
              label={t('tool.common.maxKb')}
              suffix="KB"
              value={Number.isFinite(s.maxKB) ? s.maxKB : null}
              min={1}
              step="any"
              onChange={(maxKB) => set({ maxKB: maxKB ?? Number.NaN })}
              invalid={errs.includes('kb')}
            />
            <FieldError message={errs.length ? errs.map((e) => t(`tool.custom.errors.${e}`)).join(' ') : null} />
          </SettingsPanel>
          <SourceBar
            t={t}
            image={src.image}
            loading={src.loading}
            error={src.error}
            allowPdf
            goal={ruleText ? t('tool.flow.goalSpec', { rule: ruleText }) : undefined}
            onFile={(f) => {
              job.clear();
              crop.current = null;
              void src.load(f);
            }}
            onReset={again}
          />
        </>
      }
      output={
        <>
          {job.busy && <Working label={t('tool.custom.working')} />}
          {!job.busy && job.error && <ErrorBox message={errorMessage(t, job.error)} actions={fixes} />}
          {!job.busy && job.result && spec && (
            <ResultPanel
              t={t}
              tool={TOOL}
              output={job.result}
              before={src.image?.file}
              meter={{ minKB: spec.minKB, maxKB: spec.maxKB }}
              onAgain={again}
            />
          )}
        </>
      }
      settings={
        <>
          <MoreOptions title={t('tool.flow.moreOptions')} hint={t('tool.flow.moreOptionsHint')}>
            <NumberField
              label={t('tool.common.minKb')}
              suffix="KB"
              value={s.minKB}
              min={0}
              step="any"
              placeholder={t('tool.common.optional')}
              hint={t('tool.flow.minKbCustomHint')}
              onChange={(minKB) => set({ minKB })}
              invalid={errs.includes('kb')}
            />
            <NumberField
              label={t('tool.resize.dpi')}
              suffix="DPI"
              value={s.dpi}
              min={50}
              max={1200}
              placeholder={t('tool.common.optional')}
              hint={t('tool.flow.dpiHint')}
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
            <p className="-mt-2 text-sm text-muted">{t('tool.flow.formatHint')}</p>
            <div className="space-y-2 border-t border-border pt-3">
              <label className="block" htmlFor="custom-share">
                <span className="text-sm font-semibold">{t('tool.custom.shareLabel')}</span>
                <span className="block text-sm text-muted">{t('tool.flow.shareHint')}</span>
                <input id="custom-share" className={inputClass} readOnly value={shareUrl} onFocus={(e) => e.currentTarget.select()} />
              </label>
              <Button block onClick={copy} disabled={errs.length > 0}>
                {copied ? <Check size={20} aria-hidden="true" /> : <Share2 size={20} aria-hidden="true" />}
                {copied ? t('tool.custom.copied') : t('tool.custom.copy')}
              </Button>
            </div>
          </MoreOptions>
          {src.image && (
            <MoreOptions title={t('tool.flow.adjustCrop')} hint={t('tool.flow.adjustHint')} open={adjust} onToggle={setAdjust}>
              {adjust && (
                <>
                  <Cropper
                    key={`${src.image.src}|${aspect ?? 'free'}`}
                    t={t}
                    src={src.image.src}
                    width={src.image.img.width}
                    height={src.image.img.height}
                    aspect={aspect}
                    guide="none"
                    initial={crop.current ?? undefined}
                    onChange={(c) => {
                      crop.current = c;
                    }}
                  />
                  <Button variant="primary" block busy={job.busy} disabled={!spec} onClick={fitNow}>
                    {t('tool.ink.refit')}
                  </Button>
                </>
              )}
            </MoreOptions>
          )}
        </>
      }
      footer={<LiveRegion message={announce} />}
    />
  );
}
