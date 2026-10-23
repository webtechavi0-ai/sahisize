/**
 * T2 Resize (SPEC 5.2): width × height in px, cm, mm or inches with DPI, aspect lock,
 * JPG or PNG, optional max KB. Flow: resize() to the exact pixels -> fit() with a fixed
 * spec (writes DPI, checks, KB cap). Mounted by /tools/resize-image (+ Hindi).
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import type { Lang } from '@/config/site';
import { createT, type Dict } from '@/i18n/core';
import { LiveRegion } from '@/components/ui/LiveRegion';
import { loadEngine } from '@/components/kit/engine';
import { errorCode, errorMessage } from '@/components/kit/errors';
import { canDownload, passSummary } from '@/components/kit/PassCheck';
import { track } from '@/lib/analytics';
import { formatKB } from '@/lib/format';
import { Choice, FieldError, NumberField, SettingsPanel } from '@/components/tools/SettingsPanel';
import { UnitInput, type UnitSize } from '@/components/tools/UnitInput';
import { SourceBar } from '@/components/tools/SourceBar';
import { ResultPanel, type ToolOutput } from '@/components/tools/ResultPanel';
import { useToolImage } from '@/components/tools/useToolImage';
import { useDebounced, useRun } from '@/components/tools/useRun';
import {
  DEFAULT_DPI,
  baseName,
  fixedSpec,
  fromPx,
  lockedPair,
  toPx,
  validPx,
  visibleChecks,
  type SizeUnit,
} from '@/components/tools/logic';
import { ToolColumns } from '@/components/tools/ToolColumns';
import { ErrorBox, Working } from '@/components/tools/Flow';

/** A one-tap size (e.g. "3.5×4.5 cm, 200 DPI") for the preset pages. */
export interface ResizeSizeOption {
  id: string;
  label: string;
  w: number;
  h: number;
  unit: SizeUnit;
  dpi?: number;
}

export interface ToolResizeProps {
  lang: Lang;
  dict: Dict;
  /**
   * Preset pages: starting unit/size/DPI/KB. With both `w` and `h` set the size is a fixed
   * box: a new file keeps it, and the photo is centre-cropped to it instead of stretched.
   */
  initial?: { unit?: SizeUnit; w?: number; h?: number; dpi?: number; maxKB?: number | null };
  /** Quick size buttons shown above the unit fields. */
  sizes?: readonly ResizeSizeOption[];
  /** Legend for the quick size buttons. */
  sizesLabel?: string;
}

const TOOL = 'resize-image';

export default function ToolResize({ dict, initial, sizes, sizesLabel }: ToolResizeProps) {
  const t = useMemo(() => createT(dict), [dict]);
  const box = initial?.w !== undefined && initial.h !== undefined;
  const [size, setSize] = useState<UnitSize>({
    w: initial?.w ?? null,
    h: initial?.h ?? null,
    unit: initial?.unit ?? 'px',
    dpi: initial?.dpi ?? DEFAULT_DPI,
    lock: !box,
  });
  const [format, setFormat] = useState<'jpg' | 'png'>('jpg');
  const [maxKB, setMaxKB] = useState<number | null>(initial?.maxKB ?? null);
  const [announce, setAnnounce] = useState('');
  const src = useToolImage(TOOL);
  const job = useRun<ToolOutput>();
  const aspect = src.image ? src.image.img.width / src.image.img.height : 0;

  // New file: start from its own pixel size.
  useEffect(() => {
    const im = src.image?.img;
    if (!im || box) return;
    setSize((s) => ({
      ...s,
      w: fromPx(im.width, s.unit, s.dpi ?? DEFAULT_DPI),
      h: fromPx(im.height, s.unit, s.dpi ?? DEFAULT_DPI),
    }));
  }, [src.image]);

  const dpi = size.dpi ?? DEFAULT_DPI;
  const pxW = size.w === null ? 0 : toPx(size.w, size.unit, dpi);
  const pxH = size.h === null ? 0 : toPx(size.h, size.unit, dpi);
  const ok = validPx(pxW, pxH);
  const kbOk = maxKB === null || (maxKB >= 1 && maxKB <= 50 * 1024);

  const setW = (v: number | null) =>
    setSize((s) => (s.lock && v !== null && aspect ? { ...s, ...lockedPair('w', v, aspect, s.unit === 'px' ? 0 : 2) } : { ...s, w: v }));
  const setH = (v: number | null) =>
    setSize((s) => (s.lock && v !== null && aspect ? { ...s, ...lockedPair('h', v, aspect, s.unit === 'px' ? 0 : 2) } : { ...s, h: v }));
  const setUnit = (u: SizeUnit) =>
    setSize((s) => {
      const d = s.dpi ?? DEFAULT_DPI;
      const wpx = s.w === null ? null : toPx(s.w, s.unit, d);
      const hpx = s.h === null ? null : toPx(s.h, s.unit, d);
      return { ...s, unit: u, w: wpx === null ? null : fromPx(wpx, u, d), h: hpx === null ? null : fromPx(hpx, u, d) };
    });
  const setLock = (lock: boolean) =>
    setSize((s) => (lock && s.w !== null && aspect ? { ...s, lock, ...lockedPair('w', s.w, aspect, s.unit === 'px' ? 0 : 2) } : { ...s, lock }));

  const resize = () => {
    const image = src.image;
    if (!image || !ok || !kbOk) return;
    const spec = fixedSpec({
      w: pxW,
      h: pxH,
      maxKB,
      dpi: size.dpi,
      format,
      fileName: `${baseName(image.file.name)}-${pxW}x${pxH}.${format}`,
    });
    setAnnounce(t('tool.resize.working', { px: t('common.units.px', { w: pxW, h: pxH }) }));
    void job.run(async () => {
      const engine = await loadEngine();
      const t0 = performance.now();
      let res;
      if (box && !size.lock) {
        // Fixed box (preset pages): fit() centre-crops to the box shape instead of stretching.
        res = await engine.fit(image.img, spec);
      } else {
        const sized = await engine.resize(image.img, pxW, pxH);
        try {
          res = await engine.fit(sized, spec);
        } finally {
          engine.release(sized);
        }
      }
      const checks = visibleChecks(res.checks, maxKB !== null);
      track('fit_done', { tool: TOOL, doc: 'other', pass: canDownload(checks), stages: res.stages, ms: Math.round(performance.now() - t0) });
      track('tool_used', { tool: TOOL, target: `${pxW}x${pxH}` });
      setAnnounce(`${t('tool.common.resultReady', { kb: formatKB(res.sizeBytes) })} ${passSummary(t, checks)}`);
      return {
        blob: new Blob([res.bytes], { type: format === 'png' ? 'image/png' : 'image/jpeg' }),
        fileName: spec.fileName,
        sizeBytes: res.sizeBytes,
        checks,
        width: res.widthPx,
        height: res.heightPx,
        warnings: res.warnings,
      };
    });
  };

  const later = useDebounced(resize, 500);
  useEffect(() => {
    if (src.image) later();
  }, [src.image, pxW, pxH, format, maxKB, size.dpi]);

  useEffect(() => {
    if (job.error) {
      track('error', { code: errorCode(job.error), tool: TOOL });
      setAnnounce(errorMessage(t, job.error));
    }
  }, [job.error]);

  const upscale = src.image && ok && (pxW > src.image.img.width || pxH > src.image.img.height);

  const again = () => {
    job.clear();
    src.reset();
  };

  return (
    <ToolColumns
      empty={t('tool.common.resultEmpty')}
      active={job.busy || !!job.error || !!job.result}
      input={
        <>
      <SourceBar
        t={t}
        image={src.image}
        loading={src.loading}
        error={src.error}
        onFile={(f) => {
          job.clear();
          void src.load(f);
        }}
        onReset={again}
      />
      <SettingsPanel title={t('tool.common.settings')}>
        {sizes && sizes.length > 0 && (
          <Choice
            label={sizesLabel ?? t('tool.resize.unit')}
            value={sizes.find((o) => o.unit === size.unit && o.w === size.w && o.h === size.h && (o.dpi ?? dpi) === dpi)?.id ?? ''}
            options={sizes.map((o) => ({ value: o.id, label: o.label }))}
            onChange={(id) => {
              const o = sizes.find((x) => x.id === id);
              if (o) setSize((s) => ({ ...s, unit: o.unit, w: o.w, h: o.h, dpi: o.dpi ?? s.dpi, lock: false }));
            }}
          />
        )}
        <UnitInput
          t={t}
          value={size}
          onWidth={setW}
          onHeight={setH}
          onUnit={setUnit}
          onDpi={(v) => setSize((s) => ({ ...s, dpi: v }))}
          onLock={setLock}
          pxPreview={ok ? t('common.units.px', { w: pxW, h: pxH }) : undefined}
          invalid={src.image !== null && !ok}
        />
        <Choice
          label={t('tool.common.format')}
          value={format}
          options={[
            { value: 'jpg', label: 'JPG' },
            { value: 'png', label: 'PNG' },
          ]}
          onChange={setFormat}
        />
        <NumberField
          label={t('tool.common.maxKb')}
          suffix="KB"
          value={maxKB}
          min={1}
          step="any"
          placeholder={t('tool.common.noLimit')}
          hint={t('tool.resize.maxKbHint')}
          onChange={setMaxKB}
          invalid={!kbOk}
        />
        {upscale && <p class="text-sm text-saffron-text">{t('tool.resize.upscale')}</p>}
        <FieldError message={src.image && !ok ? t('tool.resize.errors.dims') : !kbOk ? t('tool.resize.errors.kb') : null} />
      </SettingsPanel>
        </>
      }
      output={
        <>
      {job.busy && <Working label={t('tool.common.working')} />}
      {!job.busy && job.error && (
        <ErrorBox
          message={errorMessage(t, job.error)}
          actions={[
            { label: t('tool.flow.retry'), onClick: () => resize(), primary: true },
            { label: t('tool.flow.otherPhoto'), onClick: again },
          ]}
        />
      )}
      {!job.busy && job.result && (
        <ResultPanel
          t={t}
          onAgain={again}
          tool={TOOL}
          output={job.result}
          before={src.image?.file}
          meter={maxKB !== null ? { minKB: null, maxKB } : undefined}
        />
      )}
        </>
      }
      footer={<LiveRegion message={announce} />}
    />
  );
}
