'use client';
/**
 * Handwritten declaration tool (SPEC K13 standalone, /tools/handwritten-declaration):
 * 1. pick an exam's official declaration text (or paste your own), fill in the name;
 * 2. download an A4 trace sheet PDF (B's DeclarationTraceSheet: main-thread canvas ->
 *    PNG -> imagesToPdf);
 * 3. photograph the written page and resize it to the exam's rule (InkTool, no cleanup
 *    by default, free crop for KB-only rules).
 */
import { useId, useMemo, useState } from 'react';
import type { Lang } from '@/config/site';
import { createT, type Dict } from '@/i18n/core';
import { DeclarationTraceSheet } from '@/components/kit/DeclarationTraceSheet';
import { InkTool } from '@/components/tools/InkTool';
import { track } from '@/lib/analytics';
import { inputClass } from '@/components/tools/SettingsPanel';
import type { SizeOption } from '@/components/tools/logic';

export interface DeclarationExam {
  slug: string;
  name: string;
  text: string;
  toVerify: boolean;
}

export interface ToolDeclarationProps {
  lang: Lang;
  dict: Dict;
  exams: DeclarationExam[];
  options: SizeOption[];
}

const CUSTOM = '__custom';

export default function ToolDeclaration({ dict, exams, options }: ToolDeclarationProps) {
  const t = useMemo(() => createT(dict), [dict]);
  const id = useId();
  const [slug, setSlug] = useState(exams[0]?.slug ?? CUSTOM);
  const [customText, setCustomText] = useState('');
  const exam = exams.find((e) => e.slug === slug);
  const text = exam ? exam.text : customText;

  return (
    <div className="space-y-6">
      <section className="card space-y-3 p-4" aria-labelledby={`${id}-h`}>
        <h2 id={`${id}-h`} className="text-lg font-bold">
          {t('tool.declaration.step1')}
        </h2>
        <label className="block" htmlFor={`${id}-exam`}>
          <span className="text-sm font-semibold">{t('tool.declaration.exam')}</span>
          <select id={`${id}-exam`} className={inputClass} value={slug} onChange={(e) => setSlug(e.currentTarget.value)}>
            {exams.map((e) => (
              <option key={e.slug} value={e.slug}>
                {e.name}
              </option>
            ))}
            <option value={CUSTOM}>{t('tool.declaration.ownText')}</option>
          </select>
        </label>
        {slug === CUSTOM && (
          <label className="block" htmlFor={`${id}-text`}>
            <span className="text-sm font-semibold">{t('tool.declaration.textLabel')}</span>
            <textarea
              id={`${id}-text`}
              rows={5}
              maxLength={1200}
              className={`${inputClass} py-2`}
              value={customText}
              placeholder={t('tool.declaration.textPlaceholder')}
              onInput={(e) => setCustomText(e.currentTarget.value)}
            />
          </label>
        )}
      </section>
      {text.trim() ? (
        <DeclarationTraceSheet
          key={slug}
          t={t}
          examName={exam?.name ?? t('tool.declaration.yourExam')}
          text={text}
          toVerify={exam?.toVerify}
          onMade={() => track('tool_used', { tool: 'handwritten-declaration', target: 'trace-sheet' })}
        />
      ) : (
        <p className="text-sm text-muted">{t('tool.declaration.needText')}</p>
      )}
      <section className="space-y-3" aria-labelledby={`${id}-scan`}>
        <h2 id={`${id}-scan`} className="text-lg font-bold">
          {t('tool.declaration.step3')}
        </h2>
        <p className="text-sm text-muted">{t('tool.declaration.step3Body')}</p>
        <InkTool
          t={t}
          tool="handwritten-declaration"
          doc="declaration"
          options={options}
          custom={{ w: 800, h: 400, minKB: 50, maxKB: 100, dpi: 200 }}
          tip={t('tool.declaration.scanTip')}
        />
      </section>
    </div>
  );
}
