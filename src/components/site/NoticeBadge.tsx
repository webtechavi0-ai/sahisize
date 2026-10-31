/**
 * Source badge on exam and exam-document pages (SPEC 6.3 #2, 5.3).
 *  - Verified preset (official source, see isVerifiedPreset):
 *    "Specs from the IBPS notice: CRP PO/MT-XVI · checked 12 Oct 2026 · Source"
 *  - Otherwise: "Unverified — sizes from secondary sources. Check the official notice
 *    before uploading. Notice: CRP CSA-XVI · checked 12 Oct 2026 · Source we used", in a
 *    soft saffron (caution, not error) style.
 */
import Icon from './Icon';
import { t } from '@/i18n';
import type { Lang } from '@/config/site';
import type { ExamPreset } from '@/content/presets/schema';
import { isVerifiedPreset } from '@/content/presets/verified';
import { formatDate } from '@/seo/spec-text';

interface Props {
  lang: Lang;
  preset: ExamPreset;
}

export default function NoticeBadge({ lang, preset: p }: Props) {
  const verified = isVerifiedPreset(p);
  // Add the cycle year when the notification name has none ("State Service Examination" -> "... 2026").
  const year = p.cycle.match(/\b(19|20)\d{2}\b/)?.[0];
  const notification = year && !/\b(19|20)\d{2}\b/.test(p.notification) ? `${p.notification} ${year}` : p.notification;
  const date = formatDate(p.lastChecked, lang);

  if (verified) {
    return (
      <p
        className="inline-flex flex-wrap items-center gap-x-1 gap-y-0.5 rounded-card border border-border bg-surface px-3 py-2 text-sm text-muted"
        data-source-status="verified"
      >
        <Icon name="badge" size={18} className="shrink-0 text-success" />
        <span>{t(lang, 'site.exam.noticeBadge', { exam: p.body, notification, date })}</span>
        <a href={p.sourceUrl} rel="noopener nofollow external" target="_blank" className="inline-flex min-h-tap items-center font-semibold">
          {t(lang, 'site.exam.source')}
          {p.sourcePage ? ` (${t(lang, 'site.exam.sourcePage', { page: p.sourcePage })})` : ''}
        </a>
      </p>
    );
  }
  return (
    <p
      className="inline-flex flex-wrap items-center gap-x-1 gap-y-0.5 rounded-card border border-saffron bg-saffron-soft px-3 py-2 text-sm text-text"
      data-source-status="unverified"
    >
      <Icon name="info" size={18} className="shrink-0 text-ink" />
      <span>
        <strong className="font-semibold">{t(lang, 'site.exam.unverifiedBadge')}</strong>{' '}
        {t(lang, 'site.exam.unverifiedChecked', { notification, date })}
      </span>
      <a href={p.sourceUrl} rel="noopener nofollow external" target="_blank" className="inline-flex min-h-tap items-center font-semibold text-ink">
        {t(lang, 'site.exam.secondarySource')}
      </a>
    </p>
  );
}
