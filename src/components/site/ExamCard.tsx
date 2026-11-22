/**
 * One exam card for grids (home popular, exams index, related, 404). Short exam name on the
 * card (full name in `title` and in the accessible name), year chip, meta line, and up to
 * 3 short document labels pinned to the bottom so cards in a row line up.
 */
import Icon from './Icon';
import { cardCycle, cardDocLabels, cardName, cardSizes, splitKbPairs } from './exam-card';
import { t } from '@/i18n/server';
import { type Lang } from '@/i18n/config';
import { type ExamPreset, kitDocuments } from '@/lib/presets';

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
  const n = kitDocuments(p).length;
  const full = p.name[lang];
  const short = cardName(p, lang);
  const docs = cardDocLabels(p, lang, compact ? 2 : 3);
  const sizes = cardSizes(p, lang);
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
        className="card group relative flex h-full min-h-tap flex-col p-4 no-underline shadow-e1 transition-[transform,box-shadow,border-color] duration-150 ease-out hover:-translate-y-0.5 hover:border-ink hover:shadow-e2 motion-reduce:transform-none"
      >
        <span className="flex items-start justify-between gap-2">
          <span className="min-w-0 text-h3 text-heading" data-card-name>{short !== full ? <><span aria-hidden="true">{short}</span><span className="sr-only">{full}</span></> : full}</span>
          <span className="num mt-0.5 shrink-0 whitespace-nowrap rounded-full bg-ink-soft px-2 py-0.5 text-xs font-semibold text-ink">{cardCycle(p.cycle, lang)}</span>
        </span>
        {!compact && (
          <span className="mt-1 text-sm text-muted">
            {p.body} · {n === 1 ? t(lang, 'site.exams.docsOne') : t(lang, 'site.exams.docs', { n })}
            {p.photoUploadReplacedByLive && <> · {t(lang, 'site.exams.liveBadge')}</>}
          </span>
        )}
        {sizes && (
          <span className={`num mt-1 block text-sm font-semibold leading-5 text-text [text-wrap:pretty]${compact ? ' sm:min-h-10' : ''}`} data-card-sizes>
            {splitKbPairs(sizes).map((part, i) => (i % 2 ? <span key={i} className="whitespace-nowrap">{part}</span> : part))}
          </span>
        )}
        {/* Bottom row, pinned with mt-auto so it lines up across a grid row: documents on the
            left, the arrow in its own column on the right (never under the year chip). Home
            phones (compact) drop the row: one card per line, the whole card is the link. */}
        <span className={`mt-auto grid items-end gap-x-3 pt-2 ${compact ? 'grid-cols-[minmax(0,1fr)_auto] max-sm:hidden' : 'grid-cols-1'}`}>
          <span className="flex flex-wrap gap-x-1 text-sm text-muted" data-card-docs>
            {docs.labels.map((l, i) => {
              const last = i === docs.labels.length - 1;
              return (
                <span key={i} className="whitespace-nowrap">
                  {`${l}${!last || docs.more > 0 ? ',' : ''}`}
                  {last && docs.more > 0 && <> {t(lang, 'site.exams.docShort.more', { n: docs.more })}</>}
                </span>
              );
            })}
          </span>
          {compact && (
            <span className="col-start-2 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-soft text-ink transition-colors group-hover:bg-ink group-hover:text-on-ink" aria-hidden="true">
              <Icon name="arrowRight" size={16} />
            </span>
          )}
        </span>
      </a>
    </li>
  );
}
