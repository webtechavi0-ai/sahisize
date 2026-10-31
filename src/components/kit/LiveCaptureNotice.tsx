/**
 * SSC/RRB (A.3): the photo is captured live in the form, so there is no photo step; show
 * the official live-photo tips instead. Also used (softer) when a live photo is taken in
 * addition to the uploaded one.
 */
import type { Lang } from '@/config/site';
import { Video } from '@/components/ui/Icon';
import { loc, type T } from '@/lib/format';
import type { KitPreset } from './kit-types';

export function LiveCaptureNotice({ t, lang, preset }: { t: T; lang: Lang; preset: KitPreset }) {
  const replaced = preset.photoUploadReplacedByLive;
  if (!replaced && !preset.liveCaptureAlso) return null;
  const exam = loc(preset.name, lang);
  const tips = preset.liveCaptureTips ?? [];
  const list = (
    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
      {tips.map((tip, i) => (
        <li key={i}>{loc(tip, lang)}</li>
      ))}
    </ul>
  );
  return (
    <section className="card border-primary p-4" aria-labelledby="live-capture-h">
      <h2 id="live-capture-h" className="flex items-center gap-2 font-bold text-primary">
        <Video size={20} aria-hidden="true" />
        {t(replaced ? 'kit.live.title' : 'kit.live.alsoTitle')}
      </h2>
      <p className="mt-1 text-sm">{t(replaced ? 'kit.live.body' : 'kit.live.alsoBody', { exam })}</p>
      {tips.length > 0 &&
        (replaced ? (
          list
        ) : (
          // Exams that also take a live photo: the tips are secondary here, so fold them.
          <details className="text-sm">
            <summary className="flex min-h-tap cursor-pointer items-center font-semibold text-primary">
              {t('kit.live.tipsToggle')}
            </summary>
            {list}
          </details>
        ))}
    </section>
  );
}
