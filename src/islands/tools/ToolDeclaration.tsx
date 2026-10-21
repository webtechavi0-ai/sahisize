/**
 * Handwritten declaration tool (SPEC K13 standalone, /tools/handwritten-declaration):
 * 1. pick an exam's official declaration text (or paste your own), fill in the name;
 * 2. download an A4 trace sheet PDF (B's DeclarationTraceSheet: main-thread canvas ->
 *    PNG -> imagesToPdf);
 * 3. photograph the written page and resize it to the exam's rule (InkTool, no cleanup
 *    by default, free crop for KB-only rules).
 */
import { useId, useMemo, useState } from 'preact/hooks';
import type { Lang } from '@/config/site';
import { createT, type Dict } from '@/i18n/core';
import { DeclarationTraceSheet } from '@/components/kit/DeclarationTraceSheet';
import { InkTool } from '@/components/tools/InkTool';
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
    <div class="space-y-6">
      <section class="card space-y-3 p-4" aria-labelledby={`${id}-h`}>
        <h2 id={`${id}-h`} class="text-lg font-bold">
          {t('tool.declaration.step1')}
        </h2>
        <label class="block" for={`${id}-exam`}>
          <span class="text-sm font-semibold">{t('tool.declaration.exam')}</span>
          <select id={`${id}-exam`} class={inputClass} value={slug} onChange={(e) => setSlug(e.currentTarget.value)}>
            {exams.map((e) => (
              <option key={e.slug} value={e.slug}>
                {e.name}
              </option>
            ))}
            <option value={CUSTOM}>{t('tool.declaration.ownText')}</option>
          </select>
        </label>
        {slug === CUSTOM && (
          <label class="block" for={`${id}-text`}>
            <span class="text-sm font-semibold">{t('tool.declaration.textLabel')}</span>
            <textarea
              id={`${id}-text`}
              rows={5}
              maxLength={1200}
              class={`${inputClass} py-2`}
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
        />
      ) : (
        <p class="text-sm text-muted">{t('tool.declaration.needText')}</p>
      )}
      <section class="space-y-3" aria-labelledby={`${id}-scan`}>
        <h2 id={`${id}-scan`} class="text-lg font-bold">
          {t('tool.declaration.step3')}
        </h2>
        <p class="text-sm text-muted">{t('tool.declaration.step3Body')}</p>
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
