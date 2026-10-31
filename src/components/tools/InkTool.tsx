'use client';
/**
 * Shared body of the ink tools (T4 signature, T5 thumb, declaration scan): size rule
 * (exam presets or custom px + any KB range + DPI), the kit's Cropper locked to the rule's
 * aspect with the 80% ink guide (K4), cleanup toggle/strength/ink colour (K6, SPEC 7.4),
 * then auto-fit and the same PassCheck (K7).
 *
 * Flow: one decision up front ("Which exam is it for?", a native drop-down), then the
 * upload. The fit starts as soon as the file is picked, using the default crop and
 * cleaning; "Adjust the crop or cleaning" (collapsed) holds the Cropper and the cleanup
 * controls for the few who need them. Any change there re-fits automatically.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { cropAspect, type DocSpec } from '@/engine/types';
import { Button } from '@/components/ui/Button';
import { LiveRegion } from '@/components/ui/LiveRegion';
import { Slider } from '@/components/ui/Slider';
import { Toggle } from '@/components/ui/Toggle';
import { Cropper } from '@/components/kit/Cropper';
import { defaultCropState, engineCropArgs } from '@/components/kit/crop-math';
import { loadEngine } from '@/components/kit/engine';
import { errorCode, errorMessage } from '@/components/kit/errors';
import { canDownload, passSummary } from '@/components/kit/PassCheck';
import type { CropState } from '@/lib/kit-store';
import { track } from '@/lib/analytics';
import { formatKB, type T } from '@/lib/format';
import { Choice, FieldError, NumberField, SelectField } from './SettingsPanel';
import { SourceBar } from './SourceBar';
import { ResultPanel, type ToolOutput } from './ResultPanel';
import { useToolImage } from './useToolImage';
import { useDebounced, useRun } from './useRun';
import { ErrorBox, MoreOptions, Working, type FixAction } from './Flow';
import { inkSpec, specTarget, type CustomInk, type SizeOption } from './logic';
import { ToolColumns } from '@/components/tools/ToolColumns';

export interface InkToolProps {
  t: T;
  tool: string;
  doc: 'signature' | 'thumb' | 'declaration';
  options: SizeOption[];
  /** Custom size defaults. */
  custom: CustomInk;
  /** Start with a specific option id (or 'custom'). Default: the first option. */
  initialOption?: string;
  tip?: string;
  /** Label of the size drop-down. Default "Which exam is it for?". */
  ruleLabel?: string;
  /**
   * Show the size card under the upload buttons instead of above them. For pages with one
   * fixed official size (the goal line already states it), so the upload button stays
   * above the fold on a phone.
   */
  ruleBelowUpload?: boolean;
}

export function InkTool({ t, tool, doc, options, custom: customInit, initialOption, tip, ruleLabel, ruleBelowUpload = false }: InkToolProps) {
  const [optId, setOptId] = useState(initialOption ?? options[0]?.id ?? 'custom');
  const [custom, setCustom] = useState<CustomInk>(customInit);
  const [clean, setClean] = useState(doc !== 'declaration');
  const [strength, setStrength] = useState(50);
  const [ink, setInk] = useState<'black' | 'blue'>('black');
  const [adjust, setAdjust] = useState(false);
  const [announce, setAnnounce] = useState('');
  const crop = useRef<CropState | null>(null);
  const src = useToolImage(tool, doc);
  const job = useRun<ToolOutput>();

  const spec: DocSpec | null = useMemo(() => {
    if (optId !== 'custom') return options.find((o) => o.id === optId)?.spec ?? null;
    return inkSpec(doc, custom);
  }, [optId, custom, options, doc]);
  const aspect = spec ? cropAspect(spec) : null;
  const kind = doc === 'declaration' ? null : doc;
  const option = options.find((o) => o.id === optId);

  const fitNow = () => {
    const image = src.image;
    if (!image || !spec) return;
    setAnnounce(t('tool.ink.working'));
    void job.run(async () => {
      const engine = await loadEngine();
      const t0 = performance.now();
      const state = crop.current ?? defaultCropState(image.img.width, image.img.height, aspect);
      const args = engineCropArgs(state, image.img.width, image.img.height);
      let img = await engine.crop(image.img, args.rect, args.rotationDeg, args.flip);
      try {
        if (kind && clean) {
          const cleaned = await engine.cleanup(img, kind, {
            strength,
            ink: kind === 'thumb' ? ink : 'black',
            targetAspect: aspect ?? undefined,
          });
          engine.release(img);
          img = cleaned;
        }
        const res = await engine.fit(img, spec);
        track('fit_done', { tool, doc, pass: canDownload(res.checks), stages: res.stages, ms: Math.round(performance.now() - t0) });
        track('tool_used', { tool, target: specTarget(spec) });
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

  // Fit as soon as a file is in, and again after any change to the rule or the cleaning.
  const later = useDebounced(fitNow, 400);
  useEffect(() => {
    if (src.image && spec) later();
  }, [src.image, spec, clean, strength, ink]);

  useEffect(() => {
    if (job.error) {
      track('error', { code: errorCode(job.error), tool, doc });
      setAnnounce(errorMessage(t, job.error));
    }
  }, [job.error]);

  const selectItems = [
    ...options.map((o) => ({ value: o.id, label: o.exams ? `${o.exams} · ${o.label}` : o.label })),
    { value: 'custom', label: t('tool.ink.customTitle') },
  ];
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

  const ruleCard = (
    <section className="card space-y-3 p-4" aria-label={ruleLabel ?? t('tool.ink.sizeRule')}>
      {options.length > 0 && (
        <SelectField
          label={ruleLabel ?? t('tool.ink.sizeRule')}
          value={optId}
          options={selectItems}
          onChange={setOptId}
          hint={optId === 'custom' ? t('tool.ink.customSub') : option?.label}
        />
      )}
      {options.length === 0 && <h2 className="font-semibold">{t('tool.ink.customTitle')}</h2>}
      {optId === 'custom' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <NumberField
              label={t('tool.resize.width')}
              suffix="px"
              value={custom.w}
              min={1}
              placeholder={t('tool.common.optional')}
              onChange={(w) => setCustom((c) => ({ ...c, w }))}
            />
            <NumberField
              label={t('tool.resize.height')}
              suffix="px"
              value={custom.h}
              min={1}
              placeholder={t('tool.common.optional')}
              onChange={(h) => setCustom((c) => ({ ...c, h }))}
            />
            <NumberField
              label={t('tool.common.minKb')}
              suffix="KB"
              value={custom.minKB}
              min={0}
              step="any"
              placeholder={t('tool.common.optional')}
              onChange={(minKB) => setCustom((c) => ({ ...c, minKB }))}
            />
            <NumberField
              label={t('tool.common.maxKb')}
              suffix="KB"
              value={custom.maxKB}
              min={5}
              step="any"
              onChange={(maxKB) => setCustom((c) => ({ ...c, maxKB }))}
            />
          </div>
          <NumberField
            label={t('tool.resize.dpi')}
            suffix="DPI"
            value={custom.dpi}
            min={50}
            max={1200}
            placeholder={t('tool.common.optional')}
            hint={t('tool.flow.dpiHint')}
            onChange={(dpi) => setCustom((c) => ({ ...c, dpi }))}
          />
          <p className="text-sm text-muted">{t('tool.ink.customHint')}</p>
        </div>
      )}
      {options.length > 0 && optId !== 'custom' && !ruleLabel && <p className="text-sm text-muted">{t('tool.flow.whichExamHint')}</p>}
      <FieldError message={spec ? null : t('tool.ink.invalid')} />
    </section>
  );

  return (
    <ToolColumns
      empty={t('tool.common.resultEmpty')}
      active={job.busy || !!job.error || !!job.result}
      input={
        <>
          {!ruleBelowUpload && ruleCard}
          <SourceBar
            t={t}
            image={src.image}
            loading={src.loading}
            error={src.error}
            tip={tip}
            allowPdf
            goal={option ? t('tool.flow.goalSpec', { rule: option.label }) : undefined}
            onFile={(f) => {
              job.clear();
              crop.current = null;
              void src.load(f);
            }}
            onReset={again}
          />
          {ruleBelowUpload && ruleCard}
        </>
      }
      output={
        <>
          {job.busy && <Working label={t('tool.ink.working')} />}
          {!job.busy && job.error && <ErrorBox message={errorMessage(t, job.error)} actions={fixes} />}
          {!job.busy && job.result && spec && (
            <ResultPanel
              t={t}
              tool={tool}
              doc={doc}
              output={job.result}
              before={src.image?.file}
              meter={{ minKB: spec.minKB, maxKB: spec.maxKB }}
              onAgain={again}
            />
          )}
        </>
      }
      settings={
        src.image ? (
          <MoreOptions
            title={kind ? t('tool.flow.adjust') : t('tool.flow.adjustCrop')}
            hint={t('tool.flow.adjustHint')}
            open={adjust}
            onToggle={setAdjust}
          >
            {adjust && (
              <>
                <Cropper
                  key={`${src.image.src}|${aspect ?? 'free'}`}
                  t={t}
                  src={src.image.src}
                  width={src.image.img.width}
                  height={src.image.img.height}
                  aspect={aspect}
                  guide="ink"
                  initial={crop.current ?? undefined}
                  onChange={(s) => {
                    crop.current = s;
                  }}
                />
                <Button variant="primary" block busy={job.busy} disabled={!spec} onClick={fitNow}>
                  {t('tool.ink.refit')}
                </Button>
              </>
            )}
            {kind && (
              <div className="space-y-3 border-t border-border pt-3">
                <Toggle
                  label={t(kind === 'thumb' ? 'kit.crop.cleanupThumb' : 'kit.crop.cleanup')}
                  hint={t('kit.crop.cleanupHint')}
                  checked={clean}
                  onChange={setClean}
                />
                {clean && (
                  <Slider
                    label={t('kit.crop.strength')}
                    min={0}
                    max={100}
                    step={5}
                    value={strength}
                    valueText={String(strength)}
                    onInput={setStrength}
                  />
                )}
                {clean && kind === 'thumb' && (
                  <Choice
                    label={t('kit.crop.ink')}
                    value={ink}
                    options={[
                      { value: 'black', label: t('kit.crop.inkBlack') },
                      { value: 'blue', label: t('kit.crop.inkBlue') },
                    ]}
                    onChange={setInk}
                  />
                )}
              </div>
            )}
          </MoreOptions>
        ) : null
      }
      footer={<LiveRegion message={announce} />}
    />
  );
}
