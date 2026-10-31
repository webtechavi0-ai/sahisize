/** Real portal error messages and their fixes (SPEC 6.3 #5, K16). */
import { t } from '@/i18n';
import type { Lang } from '@/config/site';
import type { ExamPreset } from '@/content/presets/schema';

interface Props {
  lang: Lang;
  preset: ExamPreset;
  /** A subset of the preset's tips (document pages show only the ones about that document). */
  tips?: ExamPreset['rejectionTips'];
}

export default function RejectionTips({ lang, preset: p, tips = p.rejectionTips }: Props) {
  if (tips.length === 0) return null;
  return (
    <section aria-labelledby="rej-h" className="mt-10">
      <h2 id="rej-h" className="text-xl font-bold">
        {t(lang, 'site.exam.rejectionTitle')}
      </h2>
      <p className="mt-1 text-muted">{t(lang, 'site.exam.rejectionIntro', { exam: p.name[lang] })}</p>
      <dl className="mt-4 space-y-3">
        {tips.map((r, i) => (
          <div key={i} className="card p-4">
            <dt className="font-semibold">
              <span className="sr-only">{t(lang, 'site.exam.rejectionError')}: </span>
              <q className="font-mono text-error-text" lang="en">
                {r.error}
              </q>
            </dt>
            <dd className="mt-1">
              <span className="font-semibold">{t(lang, 'site.exam.rejectionFix')}:</span> {r.fix[lang]}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
