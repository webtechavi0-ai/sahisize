/**
 * Govt ID Documents: fixed-spec photo tool (e.g. PAN photo, Protean scan table).
 * Pick -> crop (locked to the official aspect, face guide) -> auto-fit -> PassCheck.
 *
 * Privacy (owner rule 6): this island keeps the image only in memory. It never imports the
 * kit store (IndexedDB) and never touches localStorage; tests/unit/id-documents checks it.
 * There are no text inputs at all, so no PAN/Aadhaar number or name can be typed here.
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Lang } from '@/config/site';
import { createT, type Dict } from '@/i18n/core';
import { cropAspect, type DocSpec } from '@/engine/types';
import { Button } from '@/components/ui/Button';
import { LiveRegion } from '@/components/ui/LiveRegion';
import { Skeleton } from '@/components/ui/Skeleton';
import { Cropper } from '@/components/kit/Cropper';
import { defaultCropState, engineCropArgs } from '@/components/kit/crop-math';
import { loadEngine } from '@/components/kit/engine';
import { errorCode, errorMessage } from '@/components/kit/errors';
import { canDownload, passSummary } from '@/components/kit/PassCheck';
import { track } from '@/lib/analytics';
import { formatKB } from '@/lib/format';
import { SourceBar } from '@/components/tools/SourceBar';
import { ResultPanel, type ToolOutput } from '@/components/tools/ResultPanel';
import { useToolImage } from '@/components/tools/useToolImage';
import { useRun } from '@/components/tools/useRun';
import { specTarget } from '@/components/tools/logic';
import { ToolColumns } from '@/components/tools/ToolColumns';

/** Same shape as CropState in the kit store, declared here so this island never imports it. */
type Crop = Parameters<typeof engineCropArgs>[0];

export interface IdPhotoToolProps {
  lang: Lang;
  dict: Dict;
  /** Analytics slug, e.g. "pan-card-photo-size". */
  tool: string;
  spec: DocSpec;
  /** One line under the picker, e.g. "Target: 197×276 px, up to 20 KB, JPEG, 200 DPI". */
  target: string;
  tip?: string;
}

export default function IdPhotoTool({ dict, tool, spec, target, tip }: IdPhotoToolProps) {
  const t = useMemo(() => createT(dict), [dict]);
  const [announce, setAnnounce] = useState('');
  const crop = useRef<Crop | null>(null);
  const src = useToolImage(tool, spec.doc);
  const job = useRun<ToolOutput>();
  const aspect = cropAspect(spec);

  const fitNow = () => {
    const image = src.image;
    if (!image) return;
    setAnnounce(t('tool.custom.working'));
    void job.run(async () => {
      const engine = await loadEngine();
      const t0 = performance.now();
      const state = crop.current ?? defaultCropState(image.img.width, image.img.height, aspect);
      const args = engineCropArgs(state, image.img.width, image.img.height);
      const img = await engine.crop(image.img, args.rect, args.rotationDeg, args.flip);
      try {
        const res = await engine.fit(img, spec);
        track('fit_done', { tool, doc: spec.doc, pass: canDownload(res.checks), stages: res.stages, ms: Math.round(performance.now() - t0) });
        track('tool_used', { tool, target: specTarget(spec) });
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

  useEffect(() => {
    if (job.error) {
      track('error', { code: errorCode(job.error), tool, doc: spec.doc });
      setAnnounce(errorMessage(t, job.error));
    }
  }, [job.error]);

  const fitted = job.result !== null;

  return (
    <ToolColumns
      empty={t('tool.common.resultEmpty')}
      active={!!src.image || job.busy || !!job.error || !!job.result}
      input={
        <>
          <p class="card p-4 text-sm font-semibold" data-id-target>
            {target}
          </p>
          <SourceBar
            t={t}
            image={src.image}
            loading={src.loading}
            error={src.error}
            tip={tip}
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
        </>
      }
      output={
        <>
          {src.image && (
            <section class="card space-y-3 p-4" aria-labelledby="id-crop-h">
              <h2 id="id-crop-h" class="text-lg font-bold">
                {t('tool.ink.cropTitle')}
              </h2>
              <Cropper
                key={src.image.src}
                t={t}
                src={src.image.src}
                width={src.image.img.width}
                height={src.image.img.height}
                aspect={aspect}
                guide={spec.doc === 'photo' ? 'face' : 'ink'}
                onChange={(c) => {
                  crop.current = c;
                }}
              />
              <Button variant={fitted ? 'secondary' : 'primary'} block busy={job.busy} onClick={fitNow}>
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
          {!job.busy && job.result && (
            <ResultPanel
              t={t}
              tool={tool}
              doc={spec.doc}
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
