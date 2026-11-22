/**
 * Server-rendered blocks shared by the English and Hindi exam-document pages: the answer
 * box (Size | Format | Pixels/Pages | Who uploads | Source), the "other documents" chip
 * row with the next-step link, and the related links. No client JavaScript.
 */
import type { Lang } from '@/i18n/config';
import { docSlug, type ExamPreset, type PresetDocument } from '@/lib/presets';
import { formatDate, lowerLabel } from '@/seo/spec-text';
import { localHref } from '@/server/content';
import Icon from '@/components/site/Icon';
import { kbAndFormat } from '@/components/rail/rail-data';
import { docCopy } from './copy';
import type { DocPageModel } from './page-model';

export function DocAnswerBox({
  lang,
  preset: p,
  doc: d,
  short,
  model,
}: {
  lang: Lang;
  preset: ExamPreset;
  doc: PresetDocument;
  short: string;
  model: DocPageModel;
}) {
  const c = docCopy(lang);
  const label = lang === 'hi' ? d.label.hi : lowerLabel(d.label.en);
  return (
    <section className="max-w-xl rounded-card border border-border bg-surface p-3 lg:max-w-none lg:p-4" aria-labelledby="answer-h" data-answer-box>
      <h2 id="answer-h" className="text-base font-bold">
        {c.answerTitle(short, label)}
      </h2>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        {model.answer.map((r) => (
          <div key={r.key} className="contents">
            <dt className="font-semibold">{c.rows[r.key]}</dt>
            <dd>{r.value}</dd>
          </div>
        ))}
        <dt className="font-semibold">{c.rows.source}</dt>
        <dd>
          {c.source(p.notification, p.sourcePage, formatDate(p.lastChecked, lang))}
          {p.sourceUrl && (
            <>
              {' · '}
              <a href={p.sourceUrl} rel="noopener nofollow" target="_blank">
                {c.sourceLink}
              </a>
            </>
          )}
        </dd>
      </dl>
      {model.freshness && <p className="mt-2 text-sm text-muted">{model.freshness}</p>}
    </section>
  );
}

/**
 * "Other <exam> documents" with the next-step link first, right under the tool in the main
 * column (same <nav> and id="other-h"). Each chip also shows the KB rule.
 */
export function DocOtherChips({
  lang,
  preset: p,
  model,
  title,
  className = '',
}: {
  lang: Lang;
  preset: ExamPreset;
  model: DocPageModel;
  title: string;
  className?: string;
}) {
  if (!model.others.length) return null;
  const c = docCopy(lang);
  const examName = lang === 'hi' ? p.name.hi : p.name.en;
  const href = (o: PresetDocument) => localHref(`/exam/${p.slug}/${docSlug(o)}`, lang);
  const label = (o: PresetDocument) => (lang === 'hi' ? o.label.hi : o.label.en);
  return (
    <nav aria-labelledby="other-h" className={`rounded-card border border-rule bg-card p-4 shadow-e1 xl:p-5 ${className}`} data-other-docs>
      <div className="flex flex-wrap items-center justify-between gap-x-4">
        <h2 id="other-h" className="flex items-center gap-2 text-h3">
          <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-ink-soft text-ink">
            <Icon name="file" size={18} />
          </span>
          <span className="min-w-0">{title}</span>
        </h2>
        {model.next && (
          <a
            href={href(model.next)}
            className="-mx-2 inline-flex min-h-tap items-center gap-1 rounded-xl px-2 font-semibold no-underline hover:bg-ink-soft"
          >
            {c.nextDoc(label(model.next), examName)}
            <Icon name="arrowRight" size={18} className="shrink-0" />
          </a>
        )}
      </div>
      <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {model.others.map((o) => (
          <li key={docSlug(o)} className="min-w-0">
            <a href={href(o)} className="chip h-full w-full justify-between gap-2 whitespace-normal py-1.5 text-left leading-snug">
              <span className="min-w-0">{label(o)}</span>
              <span className="num shrink-0 text-[13px] font-normal text-muted">{kbAndFormat(o, lang)}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function DocRelated({ lang, model }: { lang: Lang; model: DocPageModel }) {
  if (!model.links.length) return null;
  const c = docCopy(lang);
  return (
    <section className="mt-10" aria-labelledby="related-h">
      <h2 id="related-h" className="text-xl font-bold">
        {c.related}
      </h2>
      <ul className="mt-3 list-disc space-y-1 pl-5">
        {model.links.map((l) => (
          <li key={l.href}>
            <a href={localHref(l.href, lang)}>{l.text}</a>
          </li>
        ))}
      </ul>
    </section>
  );
}
