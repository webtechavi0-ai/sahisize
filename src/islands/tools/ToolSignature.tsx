'use client';
/**
 * T4 Signature resize (SPEC 5.2): K4 crop + K6 cleanup + any KB range.
 * Size options come from published exam presets (built on the server), plus a custom rule.
 */
import { useMemo } from 'react';
import type { Lang } from '@/config/site';
import { createT, type Dict } from '@/i18n/core';
import { InkTool } from '@/components/tools/InkTool';
import type { SizeOption } from '@/components/tools/logic';

export interface ToolSignatureProps {
  lang: Lang;
  dict: Dict;
  options: SizeOption[];
}

export default function ToolSignature({ dict, options }: ToolSignatureProps) {
  const t = useMemo(() => createT(dict), [dict]);
  return (
    <InkTool
      t={t}
      tool="signature-resize"
      doc="signature"
      options={options}
      custom={{ w: 140, h: 60, minKB: 10, maxKB: 20, dpi: 200 }}
      tip={t('tool.ink.signTip')}
    />
  );
}
