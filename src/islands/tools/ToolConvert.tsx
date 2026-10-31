'use client';
/**
 * T3 Convert (SPEC 5.2): JPG, PNG or WebP output from JPG/PNG/WebP/HEIC (and page 1 of a
 * PDF). Transparent areas get a background colour when the output is JPG.
 * Mounted by /tools/convert-image.
 */
import { useEffect, useMemo, useState } from 'react';
import type { Lang } from '@/config/site';
import { createT, type Dict } from '@/i18n/core';
import type { ConvertFormat } from '@/engine/types';
import { LiveRegion } from '@/components/ui/LiveRegion';
import { Slider } from '@/components/ui/Slider';
import { loadEngine } from '@/components/kit/engine';
import { errorCode, errorMessage } from '@/components/kit/errors';
import { passSummary } from '@/components/kit/PassCheck';
import { track } from '@/lib/analytics';
import { formatKB } from '@/lib/format';
import { Choice, SettingsPanel } from '@/components/tools/SettingsPanel';
import { SourceBar } from '@/components/tools/SourceBar';
import { ResultPanel, type ToolOutput } from '@/components/tools/ResultPanel';
import { useToolImage } from '@/components/tools/useToolImage';
import { useDebounced, useRun } from '@/components/tools/useRun';
import { baseName, mimeFor, outputChecks } from '@/components/tools/logic';
import { ToolColumns } from '@/components/tools/ToolColumns';
import { ErrorBox, Working } from '@/components/tools/Flow';

export interface ToolConvertProps {
  lang: Lang;
  dict: Dict;
  initialFormat?: ConvertFormat;
}

const TOOL = 'convert-image';
const BACKGROUNDS = ['#FFFFFF', '#000000'] as const;

export default function ToolConvert({ dict, initialFormat = 'jpg' }: ToolConvertProps) {
  const t = useMemo(() => createT(dict), [dict]);
  const [format, setFormat] = useState<ConvertFormat>(initialFormat);
  const [quality, setQuality] = useState(90);
  const [background, setBackground] = useState<string>('#FFFFFF');
  const [announce, setAnnounce] = useState('');
  const src = useToolImage(TOOL);
  const job = useRun<ToolOutput>();

  const convert = () => {
    const image = src.image;
    if (!image) return;
    setAnnounce(t('tool.convert.working', { format: format.toUpperCase() }));
    void job.run(async () => {
      const engine = await loadEngine();
      const bytes = await engine.convert(image.img, format, {
        quality: format === 'png' ? undefined : quality,
        background: format === 'jpg' ? background : undefined,
      });
      const checks = outputChecks({ bytes, format, width: image.img.width, height: image.img.height });
      track('tool_used', { tool: TOOL, target: format });
      setAnnounce(`${t('tool.common.resultReady', { kb: formatKB(bytes.length) })} ${passSummary(t, checks)}`);
      return {
        blob: new Blob([bytes], { type: mimeFor(format) }),
        fileName: `${baseName(image.file.name)}.${format}`,
        sizeBytes: bytes.length,
        checks,
        width: image.img.width,
        height: image.img.height,
      };
    });
  };

  const later = useDebounced(convert, 400);
  useEffect(() => {
    if (src.image) later();
  }, [src.image, format, quality, background]);

  useEffect(() => {
    if (job.error) {
      track('error', { code: errorCode(job.error), tool: TOOL });
      setAnnounce(errorMessage(t, job.error));
    }
  }, [job.error]);

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
        allowPdf
        capture={false}
        onFile={(f) => {
          job.clear();
          void src.load(f);
        }}
        onReset={again}
      />
      <SettingsPanel title={t('tool.common.settings')}>
        <Choice
          label={t('tool.convert.to')}
          value={format}
          options={[
            { value: 'jpg', label: 'JPG' },
            { value: 'png', label: 'PNG' },
            { value: 'webp', label: 'WebP' },
          ]}
          onChange={setFormat}
        />
        <p className="text-sm text-muted">{t(`tool.convert.about.${format}`)}</p>
        {format !== 'png' && (
          <Slider
            label={t('tool.convert.quality')}
            min={40}
            max={100}
            step={1}
            value={quality}
            valueText={String(quality)}
            onInput={setQuality}
          />
        )}
        {format === 'jpg' && (
          <Choice
            label={t('tool.convert.background')}
            value={background}
            options={BACKGROUNDS.map((c) => ({
              value: c,
              label: t(c === '#FFFFFF' ? 'tool.convert.white' : 'tool.convert.black'),
            }))}
            onChange={setBackground}
          />
        )}
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
            { label: t('tool.flow.retry'), onClick: () => convert(), primary: true },
            { label: t('tool.flow.otherPhoto'), onClick: again },
          ]}
        />
      )}
      {!job.busy && job.result && (
        <ResultPanel t={t} onAgain={again} tool={TOOL} output={job.result} before={src.image?.file} meter={undefined} />
      )}
        </>
      }
      footer={<LiveRegion message={announce} />}
    />
  );
}
