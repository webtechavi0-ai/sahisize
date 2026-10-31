/**
 * Live photo notice (SPEC A.3): SSC/RRB take the photo live in the form, so their
 * pages say so clearly and give the official tips. Exams that ALSO capture a live
 * photo (banking, NTA, UPSC) get a short note.
 */
import Icon from './Icon';
import { t } from '@/i18n';
import type { Lang } from '@/config/site';
import type { ExamPreset } from '@/content/presets/schema';

interface Props {
  lang: Lang;
  preset: ExamPreset;
}

export default function LiveCaptureTips({ lang, preset: p }: Props) {
  const tips = p.liveCaptureTips?.map((x) => x[lang]) ?? [1, 2, 3, 4].map((i) => t(lang, `site.exam.liveDefault${i}`));
  if (p.photoUploadReplacedByLive) {
    return (
      <section aria-labelledby="live-h" className="card mt-6 border-l-4 border-l-action p-4">
        <h2 id="live-h" className="flex items-center gap-2 text-lg font-bold">
          <Icon name="camera" className="text-primary" />
          {t(lang, 'site.exam.liveTitle')}
        </h2>
        <p className="mt-1">{t(lang, 'site.exam.liveText', { exam: p.name[lang] })}</p>
        <ul className="mt-2 space-y-1">
          {tips.map((tip, i) => (
            <li key={i} className="flex gap-2">
              <Icon name="check" size={20} className="mt-0.5 shrink-0 text-success" />
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </section>
    );
  }
  if (p.liveCaptureAlso) {
    return (
      <aside className="mt-6 flex gap-2 rounded-card border border-border bg-surface p-3 text-sm">
        <Icon name="camera" size={20} className="mt-0.5 shrink-0 text-primary" />
        <p>
          <strong>{t(lang, 'site.exam.liveAlsoTitle')}.</strong>{' '}
          {t(lang, 'site.exam.liveAlsoText', { exam: p.name[lang] })}
        </p>
      </aside>
    );
  }
  return null;
}
