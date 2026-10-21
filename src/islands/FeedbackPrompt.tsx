/**
 * K15 "Did the portal accept it?" (SPEC 5.1). Shown on a visit at least 1 hour after a
 * kit download (kit-store `feedback:pending`), then the key is deleted. Answers are sent
 * as the analytics event `portal_feedback` only; "No" links to the report form with
 * exam and document pre-filled (`/report?exam=&doc=`).
 *
 * Island mount (Workstream C, any page, e.g. home or exam pages):
 *   <FeedbackPrompt client:idle lang={lang} dict={getNamespace(lang, 'common', 'kit')}
 *                   reportHref={localizePath('/report', lang)} />
 * KitFlow also renders it on its checklist.
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import type { Lang } from '@/config/site';
import { createT, type Dict } from '@/i18n/core';
import { track } from '@/lib/analytics';
import type { T } from '@/lib/format';
import { clearFeedbackPending, getDueFeedback, type FeedbackPending } from '@/lib/kit-store';
import { Button, ButtonLink } from '@/components/ui/Button';
import { X } from '@/components/ui/Icon';

export function reportUrl(base: string, exam: string, doc?: string): string {
  const q = new URLSearchParams({ exam });
  if (doc) q.set('doc', doc);
  return `${base}?${q.toString()}`;
}

export function FeedbackPrompt({ t, reportHref = '/report' }: { t: T; reportHref?: string }) {
  const [p, setP] = useState<FeedbackPending | null>(null);
  const [step, setStep] = useState<'ask' | 'no' | 'thanks'>('ask');

  useEffect(() => {
    let alive = true;
    getDueFeedback()
      .then((due) => alive && setP(due))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (!p) return null;

  const answer = (a: 'yes' | 'no' | 'skip') => {
    track('portal_feedback', { exam: p.slug, answer: a });
    void clearFeedbackPending();
    setStep(a === 'no' ? 'no' : 'thanks');
  };

  const close = () => {
    void clearFeedbackPending();
    setP(null);
  };

  return (
    <section class="card relative p-4" aria-labelledby="feedback-q" aria-live="polite">
      <button
        type="button"
        class="absolute right-1 top-1 inline-flex h-tap w-tap items-center justify-center rounded-card text-muted hover:bg-bg"
        aria-label={t('kit.feedback.close')}
        onClick={close}
      >
        <X size={20} aria-hidden="true" />
      </button>
      {step === 'ask' && (
        <>
          <h2 id="feedback-q" class="pr-12 font-bold">
            {t('kit.feedback.question', { exam: p.exam })}
          </h2>
          <div class="mt-3 grid grid-cols-3 gap-2">
            <Button onClick={() => answer('yes')}>{t('kit.feedback.yes')}</Button>
            <Button onClick={() => answer('no')}>{t('kit.feedback.no')}</Button>
            <Button variant="ghost" onClick={() => answer('skip')}>
              {t('kit.feedback.skip')}
            </Button>
          </div>
        </>
      )}
      {step === 'no' && (
        <>
          <h2 id="feedback-q" class="pr-12 font-bold">
            {t('kit.feedback.whichDoc')}
          </h2>
          <ul class="mt-3 grid grid-cols-1 gap-2">
            {p.docs.map((d) => (
              <li key={d.key}>
                <ButtonLink block href={reportUrl(reportHref, p.slug, d.key)}>
                  {t('kit.feedback.report', { doc: d.label })}
                </ButtonLink>
              </li>
            ))}
            <li>
              <ButtonLink variant="ghost" block href={reportUrl(reportHref, p.slug)}>
                {t('kit.feedback.notSure')}
              </ButtonLink>
            </li>
          </ul>
        </>
      )}
      {step === 'thanks' && (
        <p id="feedback-q" class="pr-12 font-semibold">
          {t('kit.feedback.thanks')}
        </p>
      )}
    </section>
  );
}

interface IslandProps {
  lang: Lang;
  /** getNamespace(lang, 'common', 'kit') */
  dict: Dict;
  reportHref?: string;
}

export default function FeedbackPromptIsland({ dict, reportHref }: IslandProps) {
  const t = useMemo(() => createT(dict), [dict]);
  return <FeedbackPrompt t={t} reportHref={reportHref} />;
}
