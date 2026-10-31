/** Handwritten declaration text (SPEC 6.3 #6), only for exams that need one. */
import Icon from './Icon';
import { t } from '@/i18n';
import type { Lang } from '@/config/site';
import type { ExamPreset } from '@/content/presets/schema';

interface Props {
  lang: Lang;
  preset: ExamPreset;
}

export default function DeclarationText({ lang, preset: p }: Props) {
  const d = p.declarationText;
  const needs = p.documents.some((x) => x.doc === 'declaration');
  if (!d || !needs) return null;
  return (
    <section aria-labelledby="decl-h" className="mt-10">
      <h2 id="decl-h" className="text-xl font-bold">{t(lang, 'site.exam.declarationTitle')}</h2>
      <p className="mt-1 text-muted">{t(lang, 'site.exam.declarationIntro')}</p>
      <blockquote className="card mt-3 border-l-4 border-l-primary p-4 font-serif text-lg leading-relaxed" lang="en">
        {d.en}
      </blockquote>
      {lang === 'hi' && d.hi && <p className="mt-2 text-sm text-muted">{d.hi}</p>}
      {d.toVerify && (
        <p className="mt-2 flex gap-2 text-sm text-muted">
          <Icon name="info" size={18} className="mt-0.5 shrink-0" />
          {t(lang, 'site.exam.declarationToVerify')}
        </p>
      )}
    </section>
  );
}
