/**
 * T8 Passport photo sheet (SPEC 5.2, P2): crop a face photo (face oval guide), then lay
 * out 4/8/12/16 copies on A4 or 4×6 in at 300 DPI with cut lines, as PDF or JPG.
 * Copy counts that do not fit the chosen paper are disabled.
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Lang } from '@/config/site';
import { createT, type Dict } from '@/i18n/core';
import { Button } from '@/components/ui/Button';
import { Printer } from '@/components/ui/Icon';
import { LiveRegion } from '@/components/ui/LiveRegion';
import { Skeleton } from '@/components/ui/Skeleton';
import { Cropper } from '@/components/kit/Cropper';
import { defaultCropState, engineCropArgs } from '@/components/kit/crop-math';
import { loadEngine } from '@/components/kit/engine';
import { errorCode, errorMessage } from '@/components/kit/errors';
import type { CropState } from '@/lib/kit-store';
import { track } from '@/lib/analytics';
import { Choice, SettingsPanel } from '@/components/tools/SettingsPanel';
import { SourceBar } from '@/components/tools/SourceBar';
import { ResultPanel, type ToolOutput } from '@/components/tools/ResultPanel';
import { useToolImage } from '@/components/tools/useToolImage';
import { useRun } from '@/components/tools/useRun';
import {
  PHOTO_SIZES,
  SHEET_COPIES,
  jpegSize,
  mimeFor,
  outputChecks,
  sheetCapacity,
  type SheetCopies,
} from '@/components/tools/logic';
import { ToolColumns } from '@/components/tools/ToolColumns';

export interface ToolPhotoSheetProps {
  lang: Lang;
  dict: Dict;
}

const TOOL = 'passport-photo-sheet';

export default function ToolPhotoSheet({ dict }: ToolPhotoSheetProps) {
  const t = useMemo(() => createT(dict), [dict]);
  const [sizeId, setSizeId] = useState<(typeof PHOTO_SIZES)[number]['id']>('in');
  const [paper, setPaper] = useState<'a4' | '4x6'>('4x6');
  const [copies, setCopies] = useState<SheetCopies>(4);
  const [output, setOutput] = useState<'pdf' | 'jpg'>('pdf');
  const [announce, setAnnounce] = useState('');
  const crop = useRef<CropState | null>(null);
  const src = useToolImage(TOOL, 'photo');
  const job = useRun<ToolOutput>();
  const size = PHOTO_SIZES.find((s) => s.id === sizeId)!;
  const capacity = sheetCapacity(paper, size.wMm, size.hMm);
  const aspect = size.wMm / size.hMm;

  // Keep the copy count possible for the paper.
  useEffect(() => {
    if (copies > capacity) {
      const fit = [...SHEET_COPIES].reverse().find((c) => c <= capacity);
      if (fit) setCopies(fit);
    }
  }, [capacity]);
  useEffect(() => job.clear(), [sizeId, paper, copies, output]);

  const make = () => {
    const image = src.image;
    if (!image || copies > capacity) return;
    setAnnounce(t('tool.sheet.working'));
    void job.run(async () => {
      const engine = await loadEngine();
      const state = crop.current ?? defaultCropState(image.img.width, image.img.height, aspect);
      const args = engineCropArgs(state, image.img.width, image.img.height);
      const img = await engine.crop(image.img, args.rect, args.rotationDeg, args.flip);
      try {
        const bytes = await engine.photoSheet(img, { copies, paper, output, widthMm: size.wMm, heightMm: size.hMm });
        const fmt = output === 'jpg' ? 'jpg' : 'pdf';
        const dims = fmt === 'jpg' ? jpegSize(bytes) : null;
        const checks = outputChecks({ bytes, format: fmt, width: dims?.w, height: dims?.h });
        track('tool_used', { tool: TOOL, target: `${copies}:${paper}:${output}` });
        setAnnounce(t('tool.sheet.ready', { n: copies }));
        return {
          blob: new Blob([bytes], { type: mimeFor(fmt) }),
          fileName: `photo-sheet-${copies}.${fmt}`,
          sizeBytes: bytes.length,
          checks,
          width: dims?.w,
          height: dims?.h,
        };
      } finally {
        engine.release(img);
      }
    });
  };

  useEffect(() => {
    if (job.error) {
      track('error', { code: errorCode(job.error), tool: TOOL, doc: 'photo' });
      setAnnounce(errorMessage(t, job.error));
    }
  }, [job.error]);

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
        tip={t('tool.sheet.tip')}
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
        <Choice
          label={t('tool.sheet.size')}
          value={sizeId}
          options={PHOTO_SIZES.map((s) => ({ value: s.id, label: t(`tool.sheet.sizes.${s.id}`, { w: s.wMm, h: s.hMm }) }))}
          onChange={setSizeId}
        />
        <Choice
          label={t('tool.sheet.paper')}
          value={paper}
          options={[
            { value: '4x6', label: t('tool.sheet.paper4x6') },
            { value: 'a4', label: t('tool.sheet.paperA4') },
          ]}
          onChange={setPaper}
        />
        <Choice
          label={t('tool.sheet.copies')}
          value={copies}
          options={SHEET_COPIES.map((n) => ({ value: n, label: String(n) }))}
          disabledValues={SHEET_COPIES.filter((n) => n > capacity)}
          onChange={setCopies}
        />
        <p class="text-sm text-muted">{t('tool.sheet.capacity', { n: capacity })}</p>
        <Choice
          label={t('tool.common.format')}
          value={output}
          options={[
            { value: 'pdf', label: 'PDF' },
            { value: 'jpg', label: 'JPG' },
          ]}
          onChange={setOutput}
        />
      </SettingsPanel>
        </>
      }
      output={
        <>
      {src.image && (
        <section class="card space-y-3 p-4" aria-labelledby="sheet-crop-h">
          <h2 id="sheet-crop-h" class="text-lg font-bold">
            {t('tool.ink.cropTitle')}
          </h2>
          <Cropper
            key={`${src.image.src}|${aspect}`}
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
          <Button variant="primary" block busy={job.busy} disabled={copies > capacity} onClick={make}>
            <Printer size={20} aria-hidden="true" />
            {t('tool.sheet.make', { n: copies })}
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
        <ResultPanel t={t} tool={TOOL} doc="photo" output={job.result} image={output === 'jpg'}>
          <p class="text-sm text-muted">{t('tool.sheet.printTip')}</p>
        </ResultPanel>
      )}
        </>
      }
      footer={<LiveRegion message={announce} />}
    />
  );
}
