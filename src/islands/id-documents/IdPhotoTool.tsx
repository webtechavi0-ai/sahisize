/**
 * Govt ID Documents: fixed-spec photo tool (e.g. PAN photo, Protean scan table).
 * Pick -> auto-fit at once (default crop, locked to the official aspect) -> PassCheck.
 * "Adjust the crop" (collapsed) opens the Cropper with the face guide for a re-fit.
 *
 * Privacy (owner rule 6): this island keeps the image only in memory. It never imports the
 * kit store (IndexedDB) and never touches localStorage.
 * There are no text inputs at all, so no PAN/Aadhaar number or name can be typed here.
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Lang } from '@/config/site';
import { createT, type Dict } from '@/i18n/core';
import { cropAspect, type DocSpec } from '@/engine/types';
import { Button } from '@/components/ui/Button';
import { LiveRegion } from '@/components/ui/LiveRegion';
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
import { useDebounced, useRun } from '@/components/tools/useRun';
import { ErrorBox, MoreOptions, Working, type FixAction } from '@/components/tools/Flow';
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
  /** The goal above the upload buttons, e.g. "We'll make it 197×276 px, JPG, under 20 KB." */
  target: string;
  tip?: string;
}

export default function IdPhotoTool({ dict, tool, spec, target, tip }: IdPhotoToolProps) {
  const t = useMemo(() => createT(dict), [dict]);
  const [announce, setAnnounce] = useState('');
  const [adjust, setAdjust] = useState(false);
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

  // Fit as soon as the photo is in (default crop centred on the official aspect).
  const later = useDebounced(fitNow, 200);
  useEffect(() => {
    if (src.image) later();
  }, [src.image]);

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

  return (
    <ToolColumns
      empty={t('tool.common.resultEmpty')}
      active={job.busy || !!job.error || !!job.result}
      input={
        <SourceBar
          t={t}
          image={src.image}
          loading={src.loading}
          error={src.error}
          tip={tip}
          goal={target}
          onFile={(f) => {
            job.clear();
            crop.current = null;
            void src.load(f);
          }}
          onReset={again}
        />
      }
      output={
        <>
          {job.busy && <Working label={t('tool.custom.working')} />}
          {!job.busy && job.error && <ErrorBox message={errorMessage(t, job.error)} actions={fixes} />}
          {!job.busy && job.result && (
            <ResultPanel
              t={t}
              tool={tool}
              doc={spec.doc}
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
          <MoreOptions title={t('tool.flow.adjustCrop')} hint={t('tool.flow.adjustHint')} open={adjust} onToggle={setAdjust}>
            {adjust && (
              <>
                <Cropper
                  key={src.image.src}
                  t={t}
                  src={src.image.src}
                  width={src.image.img.width}
                  height={src.image.img.height}
                  aspect={aspect}
                  guide={spec.doc === 'photo' ? 'face' : 'ink'}
                  initial={crop.current ?? undefined}
                  onChange={(c) => {
                    crop.current = c;
                  }}
                />
                <Button variant="primary" block busy={job.busy} onClick={fitNow}>
                  {t('tool.ink.refit')}
                </Button>
              </>
            )}
          </MoreOptions>
        ) : null
      }
      footer={<LiveRegion message={announce} />}
    />
  );
}
