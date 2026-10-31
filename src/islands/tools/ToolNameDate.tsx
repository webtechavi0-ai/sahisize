'use client';
/**
 * Name and date on photo (SPEC K11 as a standalone tool): upload a photo, type a name and a
 * date (today by default), crop, and the engine prints them in black on a white strip below
 * the face, inside the final pixels, then fits the KB range. Size rules: published exam
 * presets that need the strip (built on the server) plus a custom size.
 *
 * Privacy: the name and date stay on the device. They are passed to engine.fit() only and
 * never reach analytics, file names or the URL.
 */
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { Lang } from '@/config/site';
import { createT, type Dict } from '@/i18n/core';
import { cropAspect, type DocSpec, type NameDate } from '@/engine/types';
import { Button } from '@/components/ui/Button';
import { LiveRegion } from '@/components/ui/LiveRegion';
import { Cropper } from '@/components/kit/Cropper';
import { defaultCropState, engineCropArgs } from '@/components/kit/crop-math';
import { loadEngine } from '@/components/kit/engine';
import { errorCode, errorMessage } from '@/components/kit/errors';
import { canDownload, passSummary } from '@/components/kit/PassCheck';
import { todayDdMmYyyy } from '@/components/kit/NameDateStripForm';
import type { CropState } from '@/lib/kit-store';
import { track } from '@/lib/analytics';
import { formatKB } from '@/lib/format';
import { FieldError, NumberField, OptionList, SettingsPanel, inputClass } from '@/components/tools/SettingsPanel';
import { SourceBar } from '@/components/tools/SourceBar';
import { ResultPanel, type ToolOutput } from '@/components/tools/ResultPanel';
import { ToolColumns } from '@/components/tools/ToolColumns';
import { ErrorBox, Working } from '@/components/tools/Flow';
import { useToolImage } from '@/components/tools/useToolImage';
import { useDebounced, useRun } from '@/components/tools/useRun';
import { specTarget, type SizeOption } from '@/components/tools/logic';
import {
  DATE_MAX_CHARS,
  NAME_DATE_CUSTOM_DEFAULT,
  NAME_MAX_CHARS,
  nameDateCustomSpec,
  nameDateError,
  nameDateFitOptions,
  type NameDateCustom,
} from '@/components/tools/name-date';

export interface ToolNameDateProps {
  lang: Lang;
  dict: Dict;
  /** Published exam rules that need the strip (server-built). */
  options: SizeOption[];
}

const TOOL = 'name-date-on-photo';

export default function ToolNameDate({ dict, options }: ToolNameDateProps) {
  const t = useMemo(() => createT(dict), [dict]);
  const fid = useId();
  const [optId, setOptId] = useState(options[0]?.id ?? 'custom');
  const [custom, setCustom] = useState<NameDateCustom>(NAME_DATE_CUSTOM_DEFAULT);
  const [nd, setNd] = useState<NameDate>(() => ({ name: '', date: todayDdMmYyyy() }));
  const [announce, setAnnounce] = useState('');
  const crop = useRef<CropState | null>(null);
  const src = useToolImage(TOOL, 'photo');
  const job = useRun<ToolOutput>();

  const spec: DocSpec | null = useMemo(() => {
    if (optId !== 'custom') return options.find((o) => o.id === optId)?.spec ?? null;
    return nameDateCustomSpec(custom);
  }, [optId, custom, options]);
  const aspect = spec ? cropAspect(spec) : null;
  const ndErr = nameDateError(nd);
  const ready = !!src.image && !!spec && !ndErr;

  const make = () => {
    const image = src.image;
    if (!image || !spec || nameDateError(nd)) return;
    setAnnounce(t('tool.nameDate.working'));
    void job.run(async () => {
      const engine = await loadEngine();
      const t0 = performance.now();
      const state = crop.current ?? defaultCropState(image.img.width, image.img.height, aspect);
      const args = engineCropArgs(state, image.img.width, image.img.height);
      const img = await engine.crop(image.img, args.rect, args.rotationDeg, args.flip);
      try {
        const res = await engine.fit(img, spec, nameDateFitOptions(nd));
        // Analytics: tool and size rule only. Never the name or the date.
        track('fit_done', { tool: TOOL, doc: 'photo', pass: canDownload(res.checks), stages: res.stages, ms: Math.round(performance.now() - t0) });
        track('tool_used', { tool: TOOL, target: specTarget(spec) });
        setAnnounce(`${t('tool.common.resultReady', { kb: formatKB(res.sizeBytes) })} ${passSummary(t, res.checks)}`);
        return {
          blob: new Blob([res.bytes], { type: 'image/jpeg' }),
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

  // After the first result, changes to the text or size re-run on their own.
  const later = useDebounced(make, 600);
  const made = job.result !== null;
  useEffect(() => {
    if (made && ready) later();
  }, [spec, nd.name, nd.date]);

  useEffect(() => {
    if (job.error) {
      track('error', { code: errorCode(job.error), tool: TOOL, doc: 'photo' });
      setAnnounce(errorMessage(t, job.error));
    }
  }, [job.error]);

  const optionItems = [
    ...options.map((o) => ({ value: o.id, title: o.label, sub: o.exams })),
    { value: 'custom', title: t('tool.nameDate.customTitle'), sub: t('tool.nameDate.customSub') },
  ];

  const again = () => {
    job.clear();
    crop.current = null;
    src.reset();
  };

  return (
    <ToolColumns
      empty={t('tool.common.resultEmpty')}
      active={!!src.image || job.busy || !!job.error || !!job.result}
      input={
        <>
          <SourceBar
            t={t}
            image={src.image}
            loading={src.loading}
            error={src.error}
            capture="user"
            tip={t('tool.nameDate.photoTip')}
            onFile={(f) => {
              job.clear();
              crop.current = null;
              void src.load(f);
            }}
            onReset={again}
          />
          <SettingsPanel title={t('tool.nameDate.textTitle')}>
            <div>
              <label htmlFor={`${fid}-n`} className="block text-sm font-semibold">
                {t('tool.nameDate.name')}
              </label>
              <input
                id={`${fid}-n`}
                className={inputClass}
                type="text"
                autoComplete="name"
                maxLength={NAME_MAX_CHARS}
                value={nd.name}
                aria-describedby={`${fid}-nh`}
                onInput={(e) => setNd((v) => ({ ...v, name: e.currentTarget.value }))}
              />
              <p id={`${fid}-nh`} className="mt-1 text-sm text-muted">
                {t('tool.nameDate.nameHint')}
              </p>
            </div>
            <div>
              <label htmlFor={`${fid}-d`} className="block text-sm font-semibold">
                {t('tool.nameDate.date')}
              </label>
              <input
                id={`${fid}-d`}
                className={inputClass}
                type="text"
                inputMode="numeric"
                placeholder="DD/MM/YYYY"
                maxLength={DATE_MAX_CHARS}
                value={nd.date}
                aria-describedby={`${fid}-dh`}
                onInput={(e) => setNd((v) => ({ ...v, date: e.currentTarget.value }))}
              />
              <p id={`${fid}-dh`} className="mt-1 text-sm text-muted">
                {t('tool.nameDate.dateHint')}
              </p>
            </div>
            <p className="text-sm text-muted">{t('tool.nameDate.style')}</p>
          </SettingsPanel>
          <SettingsPanel title={t('tool.common.settings')}>
            <OptionList label={t('tool.nameDate.sizeRule')} value={optId} options={optionItems} onChange={setOptId} />
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
                <p className="text-sm text-muted">{t('tool.nameDate.customHint')}</p>
              </div>
            )}
            <FieldError message={spec ? null : t('tool.nameDate.errors.invalid')} />
          </SettingsPanel>
        </>
      }
      output={
        <>
          {src.image && (
            <section className="card space-y-3 p-4" aria-labelledby="nd-crop-h">
              <h2 id="nd-crop-h" className="text-lg font-bold">
                {t('tool.nameDate.cropTitle')}
              </h2>
              <Cropper
                key={`${src.image.src}|${aspect ?? 'free'}`}
                t={t}
                src={src.image.src}
                width={src.image.img.width}
                height={src.image.img.height}
                aspect={aspect}
                guide="face"
                onChange={(s) => {
                  crop.current = s;
                }}
              />
              {ndErr && <p className="text-sm text-error-text">{t(`tool.nameDate.errors.${ndErr}`)}</p>}
              <Button variant={made ? 'secondary' : 'primary'} block busy={job.busy} disabled={!ready} onClick={make}>
                {made ? t('tool.nameDate.remake') : t('tool.nameDate.make')}
              </Button>
            </section>
          )}
          {job.busy && <Working label={t('tool.common.working')} />}
          {!job.busy && job.error && (
            <ErrorBox
          message={errorMessage(t, job.error)}
          actions={[
            { label: t('tool.flow.retry'), onClick: () => make(), primary: true },
            { label: t('tool.flow.otherPhoto'), onClick: again },
          ]}
        />
          )}
          {!job.busy && job.result && spec && (
            <ResultPanel
              t={t}
              onAgain={again}
              tool={TOOL}
              doc="photo"
              output={job.result}
              before={src.image?.file}
              meter={{ minKB: spec.minKB, maxKB: spec.maxKB }}
            />
          )}
        </>
      }
      footer={<LiveRegion message={announce} />}
    />
  );
}
