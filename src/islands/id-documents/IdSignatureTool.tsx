'use client';
/**
 * Govt ID Documents: signature tool. Reuses the shared ink tool (crop + cleanup + fit +
 * PassCheck) with the official spec as its only preset. In-memory only: InkTool keeps no
 * state in IndexedDB or localStorage.
 */
import { useMemo } from 'react';
import type { Lang } from '@/config/site';
import { createT, type Dict } from '@/i18n/core';
import type { DocSpec } from '@/engine/types';
import { InkTool } from '@/components/tools/InkTool';

export interface IdSignatureToolProps {
  lang: Lang;
  dict: Dict;
  tool: string;
  spec: DocSpec;
  /** Option title, e.g. "354×157 px, up to 10 KB, 200 DPI". */
  label: string;
  /** Option subtitle, e.g. "Protean (NSDL) PAN guideline". */
  sub: string;
  tip?: string;
}

export default function IdSignatureTool({ dict, tool, spec, label, sub, tip }: IdSignatureToolProps) {
  const t = useMemo(() => createT(dict), [dict]);
  return (
    <InkTool
      t={t}
      tool={tool}
      doc="signature"
      options={[{ id: 'official', label, exams: sub, spec }]}
      custom={{ w: spec.widthPx, h: spec.heightPx, minKB: null, maxKB: spec.maxKB, dpi: spec.dpi }}
      tip={tip}
      ruleLabel={t('tool.flow.sizeRule')}
      ruleBelowUpload
    />
  );
}
