/**
 * One exam card for grids (home popular, exams index, related, 404). Short exam name on the
 * card (full name in `title` and in the accessible name), year chip, meta line, and up to
 * 3 short document labels pinned to the bottom so cards in a row line up.
 */
import { t } from '@/i18n';
import Icon from './Icon';
import type { Lang } from '@/config/site';
import type { ExamPreset } from '@/content/presets/schema';
import { getKitDocuments } from '@/content/presets';
import { cardDocLabels, cardName } from './exam-card';

interface Props {
  lang: Lang;
  preset: ExamPreset;
  href: string;
  /** data-* for client filtering on /exams. */
  filterable?: boolean;
  /** Home: no "body · N documents" meta line; an arrow marks the card as tappable. */
  compact?: boolean;
}

export default function ExamCard({ lang, preset: p, href, filterable = false, compact = false }: Props) {
  const n = getKitDocuments(p).length;
  const full = p.name[lang];
  const short = cardName(p, lang);
  const docs = cardDocLabels(p, lang);
  const searchText = filterable
    ? [p.name.en, p.name.hi, p.body, ...p.aliases, p.slug].join(' ').toLowerCase()
    : undefined;
  return (
    <li
      data-exam-card={filterable ? p.slug : undefined}
      data-group={filterable ? p.group : undefined}
      data-search={searchText}
    >
      <a
        href={href}
        title={short !== full ? full : undefined}
        className="card flex h-full min-h-tap flex-col p-4 no-underline transition-colors hover:border-primary"
      >
        <span className="flex items-start justify-between gap-2">
          <span className="min-w-0 text-lg font-bold leading-snug text-primary" data-card-name>{short !== full ? <><span aria-hidden="true">{short}</span><span className="sr-only">{full}</span></> : full}</span>
          <span className="mt-0.5 shrink-0 rounded-full bg-bg px-2 py-0.5 text-xs text-muted">{p.cycle}</span>
        </span>
        {!compact && (
          <span className="mt-1 text-sm text-muted">
            {p.body} · {n === 1 ? t(lang, 'site.exams.docsOne') : t(lang, 'site.exams.docs', { n })}
            {p.photoUploadReplacedByLive && <> · {t(lang, 'site.exams.liveBadge')}</>}
          </span>
        )}
        <span className="mt-auto flex flex-wrap gap-x-1 pt-2 text-sm text-text" data-card-docs>
          {docs.labels.map((l, i) => (
            <span key={i} className="whitespace-nowrap">{`${l}${i < docs.labels.length - 1 || docs.more > 0 ? ',' : ''}`}</span>
          ))}
          {docs.more > 0 && <span className="whitespace-nowrap text-muted">{t(lang, 'site.exams.docShort.more', { n: docs.more })}</span>}
          {compact && <Icon name="arrowRight" size={20} className="ml-auto shrink-0 self-end text-primary" />}
        </span>
      </a>
    </li>
  );
}
