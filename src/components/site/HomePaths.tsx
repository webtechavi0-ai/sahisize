/**
 * Home hero ("Clear Desk, thumb-first", docs/design/home-redesign-spec.md §6), ordered by
 * traffic (the home page targets "photo size in kb"):
 *  1. H1, one short lead line and the privacy promise.
 *  2. "Just need a size?": four KB tiles, then "Other size" (the one saffron primary: it works
 *     for the visitor with no number yet) and Signature. Phones 2+2+2, from 640 px 4 + 2 wide,
 *     so a row is never half empty.
 *  3. "Filling an exam form?" (exam search + popular exam chips, always 2 full rows) and
 *     "Most searched sizes" (the answer itself for the pages search engines send people to).
 * The illustration is not in the phone hero (the H1 is the LCP element); from 768 px it sits
 * beside the text, lazy-loaded. Plain links, no JS beyond the search box. Every target >= 48 px.
 */
import type { ReactNode } from 'react';
import HeroSearch from './HeroSearch';
import Icon from './Icon';
import { t } from '@/i18n/server';
import { localizePath, type Lang } from '@/i18n/config';
import type { MostSearchedRow } from './home-sizes';

export interface PathLink {
  href: string;
  label: string;
  /** Full name when the label is shortened (tooltip). */
  title?: string;
  /** Language of the visible label when it differs from the page (Latin exam codes on /hi). */
  lang?: string;
  /** Shown only where the chip grid has 4 columns (keeps every row full). */
  wideOnly?: boolean;
}
export type TaskLink =
  | { id: string; href: string; kind: 'kb'; kb: number }
  | { id: string; href: string; kind: 'other' | 'signature' };

interface Props {
  lang: Lang;
  /** H1 content (with the "in KB" accent). */
  heading: ReactNode;
  exams: PathLink[];
  tasks: TaskLink[];
  /** Exams in the catalogue ("See all {count} exams"). */
  examCount: number;
  /** "Most searched sizes" rows; the block is left out when empty. */
  sizes?: MostSearchedRow[];
  /** Hero illustration (rendered >= 768 px only). */
  art?: ReactNode;
}

const card = 'rounded-2xl border border-rule bg-card p-4 shadow-e1 sm:p-5';
const well = 'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl';
const tile =
  'group relative flex h-full min-h-[72px] flex-col justify-center rounded-2xl border border-rule bg-card px-4 py-3 no-underline shadow-e1 transition-[transform,box-shadow,border-color] duration-150 ease-out hover:-translate-y-0.5 hover:border-ink hover:shadow-e2 active:translate-y-0 active:scale-[.98] motion-reduce:transform-none sm:min-h-[84px] lg:min-h-[88px]';

function Task({ task, tr }: { task: TaskLink; tr: (k: string) => string }) {
  if (task.kind === 'kb') {
    return (
      <a href={task.href} data-task={task.id} className={tile}>
        <span className="text-[13px] font-semibold leading-snug text-muted">{tr('site.home.tilePhoto')}</span>
        <span className="num text-stat text-heading">
          {task.kb}
          <span className="ml-1 text-base font-bold text-ink">KB</span>
        </span>
        <Icon name="arrowRight" size={16} className="absolute right-3 top-3 text-muted transition-colors group-hover:text-ink" />
      </a>
    );
  }
  if (task.kind === 'other') {
    return (
      <a
        href={task.href}
        data-task={task.id}
        className="btn-action h-full min-h-[64px] w-full justify-start gap-2 rounded-2xl px-3 py-2.5 text-left sm:gap-3 sm:px-4"
      >
        <Icon name="sliders" size={22} className="shrink-0 max-[359px]:hidden" />
        <span className="min-w-0 flex-1 leading-snug">
          <span className="block text-base font-bold">{tr('site.home.otherSize')}</span>
          <span className="block text-[13px] font-semibold opacity-90">{tr('site.home.otherSizeSub')}</span>
        </span>
        <Icon name="arrowRight" size={18} className="hidden shrink-0 sm:block" />
      </a>
    );
  }
  return (
    <a
      href={task.href}
      data-task={task.id}
      className="btn-secondary h-full min-h-[64px] w-full justify-start gap-2 rounded-2xl px-3 py-2.5 text-left sm:gap-3 sm:px-4"
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ink-soft text-ink max-[399px]:hidden sm:h-10 sm:w-10 sm:rounded-xl">
        <Icon name="pen" size={20} />
      </span>
      <span className="min-w-0 flex-1 leading-snug">
        <span className="block text-base font-bold text-ink">{tr('site.home.signature')}</span>
        <span className="block text-[13px] font-semibold text-muted">{tr('site.home.signatureSub')}</span>
      </span>
    </a>
  );
}

export default function HomePaths({ lang, heading, exams, tasks, examCount, sizes = [], art }: Props) {
  const tr = (k: string, v?: Record<string, string | number>) => t(lang, k, v);
  return (
    <section className="hero-wash band-plain">
      <div className="w-full pb-8 pt-5 sm:pb-10 sm:pt-10 lg:pb-16 lg:pt-14">
        <div className="grid gap-y-5 md:grid-cols-[minmax(0,1fr)_280px] md:gap-x-8 lg:grid-cols-12 lg:grid-rows-[auto_1fr] lg:gap-x-10">
          <div className="min-w-0 md:col-start-1 md:row-start-1 lg:col-span-7">
            <h1 className="text-hero text-heading">{heading}</h1>
            <p className="mt-2 text-lead text-muted sm:mt-3">{tr('site.home.heroSub')}</p>
            <p className="mt-2 flex items-start gap-2 text-[15px] font-semibold text-chalk-text" data-privacy-line>
              <Icon name="shield" size={18} className="mt-0.5 shrink-0 text-chalk" />
              <span>{tr('site.home.heroPrivacy')}</span>
            </p>
          </div>

          <section
            aria-labelledby="path-size-h"
            data-path="size"
            className="min-w-0 md:col-span-2 md:row-start-2 lg:col-span-7 lg:col-start-1 lg:row-start-2 lg:self-start"
          >
            <h2 id="path-size-h" className="sr-only lg:not-sr-only lg:mb-3 lg:text-[15px] lg:font-semibold">
              {tr('site.home.pathSize')}
            </h2>
            <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3" data-size-tasks>
              {tasks.map((x) => (
                <li key={x.id} className={x.kind === 'kb' ? undefined : 'col-span-1 sm:col-span-2'}>
                  <Task task={x} tr={tr} />
                </li>
              ))}
            </ul>
          </section>

          {art && (
            <div className="hidden md:col-start-2 md:row-start-1 md:block md:self-center lg:col-span-5 lg:col-start-8 lg:row-span-2 lg:row-start-1 lg:w-full lg:max-w-[600px] lg:self-center lg:justify-self-end">
              {art}
            </div>
          )}
        </div>

        <div data-home-paths className="mt-5 grid gap-4 md:grid-cols-2 md:items-start lg:mt-10 lg:grid-cols-12 lg:gap-10">
          <section aria-labelledby="path-exam-h" className={`${card} flex flex-col lg:col-span-7`} data-path="exam">
            <p className="text-sm font-semibold text-muted">{tr('site.home.pathExamKicker')}</p>
            <h2 id="path-exam-h" className="mt-1 flex items-center gap-2.5 text-h3">
              <span className={`${well} bg-ink-soft text-ink`} aria-hidden="true">
                <Icon name="search" size={18} />
              </span>
              {tr('site.home.pathExam')}
            </h2>
            <p className="mt-1 hidden text-sm text-muted sm:block">{tr('site.home.pathExamHint')}</p>
            <div className="mt-3">
              <HeroSearch lang={lang} />
            </div>
            {/* 3 columns x 2 rows on phones and on half-width cards (768-1023), 4 x 2 elsewhere. */}
            <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-3 lg:grid-cols-4" data-exam-chips>
              {exams.map((e) => (
                <li key={e.href} className={e.wideOnly ? 'hidden sm:block md:hidden lg:block' : undefined}>
                  <a
                    href={e.href}
                    title={e.title}
                    lang={e.lang}
                    className="chip w-full whitespace-normal px-1.5 text-center leading-tight"
                  >
                    {e.label}
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex justify-end">
              <a
                href={localizePath('/exams', lang)}
                className="inline-flex min-h-tap items-center gap-1 rounded-xl px-2 text-[15px] font-semibold text-ink no-underline hover:bg-ink-soft"
              >
                <span className="sm:hidden">{tr('site.home.allShort', { count: examCount })}</span>
                <span className="hidden sm:inline">{tr('site.home.allExams', { count: examCount })}</span>
                <Icon name="arrowRight" size={16} className="shrink-0" />
              </a>
            </div>
          </section>

          {sizes.length > 0 && (
            <section aria-labelledby="path-top-h" className={`${card} lg:col-span-5`} data-most-searched>
              <h2 id="path-top-h" className="flex items-center gap-2.5 text-h3">
                <span className={`${well} bg-saffron-soft text-saffron-text`} aria-hidden="true">
                  <Icon name="badge" size={18} />
                </span>
                {tr('site.home.sizesTitle')}
              </h2>
              <ul className="mt-2 divide-y divide-rule">
                {sizes.map((r) => (
                  <li key={r.id}>
                    <a
                      href={r.href}
                      data-size-row={r.id}
                      className="-mx-2 grid min-h-[56px] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 rounded-xl px-2 py-2.5 no-underline transition-colors duration-150 hover:bg-ink-soft"
                    >
                      {/* One layout at every width: label (full width) over the pill, chevron centred. */}
                      <span className="min-w-0">
                        <span className="block font-semibold leading-snug text-heading [text-wrap:pretty]">{r.label}</span>
                        <span className="num mt-1 inline-block rounded-full bg-ink-soft px-2.5 py-0.5 text-sm font-bold text-ink">{r.spec}</span>
                      </span>
                      <Icon name="arrowRight" size={16} className="shrink-0 text-muted" />
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </section>
  );
}
