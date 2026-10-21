/**
 * Shared body of the ink tools (T4 signature, T5 thumb, declaration scan): size rule
 * (exam presets or custom px + any KB range + DPI), the kit's Cropper locked to the rule's
 * aspect with the 80% ink guide (K4), cleanup toggle/strength/ink colour (K6, SPEC 7.4),
 * then auto-fit and the same PassCheck (K7).
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { cropAspect, type DocSpec } from '@/engine/types';
import { Button } from '@/components/ui/Button';
import { LiveRegion } from '@/components/ui/LiveRegion';
import { Skeleton } from '@/components/ui/Skeleton';
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
import { Choice, FieldError, NumberField, OptionList, SettingsPanel } from './SettingsPanel';
import { SourceBar } from './SourceBar';
import { ResultPanel, type ToolOutput } from './ResultPanel';
import { useToolImage } from './useToolImage';
import { useDebounced, useRun } from './useRun';
import { inkSpec, specTarget, type CustomInk, type SizeOption } from './logic';

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
}

export function InkTool({ t, tool, doc, options, custom: customInit, initialOption, tip }: InkToolProps) {
  const [optId, setOptId] = useState(initialOption ?? options[0]?.id ?? 'custom');
  const [custom, setCustom] = useState<CustomInk>(customInit);
  const [clean, setClean] = useState(doc !== 'declaration');
  const [strength, setStrength] = useState(50);
  const [ink, setInk] = useState<'black' | 'blue'>('black');
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

  // After the first fit, settings changes re-fit automatically.
  const later = useDebounced(fitNow, 500);
  const fitted = job.result !== null;
  useEffect(() => {
    if (fitted && src.image) later();
  }, [spec, clean, strength, ink]);

  useEffect(() => {
    if (job.error) {
      track('error', { code: errorCode(job.error), tool, doc });
      setAnnounce(errorMessage(t, job.error));
    }
  }, [job.error]);

  const optionItems = [
    ...options.map((o) => ({ value: o.id, title: o.label, sub: o.exams })),
    { value: 'custom', title: t('tool.ink.customTitle'), sub: t('tool.ink.customSub') },
  ];

  return (
    <div class="space-y-4">
      <SourceBar
        t={t}
        image={src.image}
        loading={src.loading}
        error={src.error}
        tip={tip}
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
      <SettingsPanel title={t('tool.common.settings')}>
        <OptionList label={t('tool.ink.sizeRule')} value={optId} options={optionItems} onChange={setOptId} />
        {optId === 'custom' && (
          <div class="space-y-3">
            <div class="grid grid-cols-2 gap-3">
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
              onChange={(dpi) => setCustom((c) => ({ ...c, dpi }))}
            />
            <p class="text-sm text-muted">{t('tool.ink.customHint')}</p>
          </div>
        )}
        <FieldError message={spec ? null : t('tool.ink.invalid')} />
        {kind && (
          <div class="space-y-3 border-t border-border pt-3">
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
      </SettingsPanel>
      {src.image && (
        <section class="card space-y-3 p-4" aria-labelledby="ink-crop-h">
          <h2 id="ink-crop-h" class="text-lg font-bold">
            {t('tool.ink.cropTitle')}
          </h2>
          <Cropper
            key={`${src.image.src}|${aspect ?? 'free'}`}
            t={t}
            src={src.image.src}
            width={src.image.img.width}
            height={src.image.img.height}
            aspect={aspect}
            guide="ink"
            onChange={(s) => {
              crop.current = s;
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
        <ResultPanel
          t={t}
          tool={tool}
          doc={doc}
          output={job.result}
          before={src.image?.file}
          meter={{ minKB: spec.minKB, maxKB: spec.maxKB }}
        />
      )}
      <LiveRegion message={announce} />
    </div>
  );
}
