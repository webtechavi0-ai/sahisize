'use client';
/**
 * T5 Thumb impression (SPEC 5.2): K4 crop + K6 cleanup (black or blue ink) + any KB range.
 * Size options come from published exam presets (built on the server), plus a custom rule.
 */
import { useMemo } from 'react';
import type { Lang } from '@/config/site';
import { createT, type Dict } from '@/i18n/core';
import { InkTool } from '@/components/tools/InkTool';
import type { SizeOption } from '@/components/tools/logic';

export interface ToolThumbProps {
  lang: Lang;
  dict: Dict;
  options: SizeOption[];
}

export default function ToolThumb({ dict, options }: ToolThumbProps) {
  const t = useMemo(() => createT(dict), [dict]);
  return (
    <InkTool
      t={t}
      tool="thumb-impression"
      doc="thumb"
      options={options}
      custom={{ w: 240, h: 240, minKB: 20, maxKB: 50, dpi: 200 }}
      tip={t('tool.ink.thumbTip')}
    />
  );
}
