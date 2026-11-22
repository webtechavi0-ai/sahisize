/** Related exams (SPEC 6.3 #8, 9.1 internal links). Only published presets. */
import ExamCard from './ExamCard';
import { t } from '@/i18n/server';
import { type Lang } from '@/i18n/config';
import { type ExamPreset } from '@/lib/presets';
import { localHref, relatedExamsFor } from '@/server/content';

interface Props {
  lang: Lang;
  preset: ExamPreset;
}

export default function RelatedExams({ lang, preset: p }: Props) {
  const related = relatedExamsFor(p);
  const href = (s: string) => localHref(`/exam/${s}`, lang);
  if (related.length === 0) return null;
  return (
    <section aria-labelledby="rel-h" className="mt-10">
      <h2 id="rel-h" className="text-xl font-bold">
        {t(lang, 'site.exam.relatedTitle')}
      </h2>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {related.map((r) => (
          <ExamCard key={r.slug} lang={lang} preset={r} href={href(r.slug)} />
        ))}
      </ul>
    </section>
  );
}
