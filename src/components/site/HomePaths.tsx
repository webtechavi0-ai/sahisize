/**
 * Home hero: the two jobs people arrive with, side by side (stacked on phones).
 *  A. "Filling an exam form?": exam search + big popular-exam chips (most people never type).
 *  B. "Just need a size?": big task buttons straight to a tool.
 * Plain links, no JS beyond the existing search island. Every target is >= 48 px.
 */
import HeroSearch from './HeroSearch';
import Icon from './Icon';
import { t } from '@/i18n';
import type { Lang } from '@/config/site';
import { CORE_PROMISE } from '@/config/site';

export interface PathLink {
  href: string;
  label: string;
  /** Full name when the label is shortened. */
  title?: string;
  /** Shown from 640 px only (keeps the phone hero short). */
  wideOnly?: boolean;
}
export interface TaskLink {
  id: string;
  href: string;
  label: string;
  icon: 'file' | 'pen' | 'camera' | 'crop' | 'badge';
}
interface Props {
  lang: Lang;
  exams: PathLink[];
  tasks: TaskLink[];
}

const panel = 'card rounded-2xl p-3 shadow-lift sm:p-5';
// Icons, not numbers: the two paths are alternatives, not steps.
const step = 'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold';

export default function HomePaths({ lang, exams, tasks }: Props) {
  const tr = (k: string) => t(lang, k);
  return (
    <>
      <div className="mt-4 grid gap-3 sm:gap-4 md:grid-cols-2 md:items-start lg:grid-cols-1 xl:grid-cols-2" data-home-paths>
        <section aria-labelledby="path-exam-h" className={panel} data-path="exam">
          <h2 id="path-exam-h" className="flex items-center gap-2 text-lg font-bold text-ink">
            <span className={`${step} bg-ink text-on-ink`} aria-hidden="true">
              <Icon name="search" size={16} />
            </span>
            {tr('site.home.pathExam')}
          </h2>
          <p className="mt-1 text-sm text-muted">{tr('site.home.pathExamHint')}</p>
          <div className="mt-2">
            <HeroSearch lang={lang} />
          </div>
          <ul className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-3" data-exam-chips>
            {exams.map((e) => (
              <li key={e.href} className={e.wideOnly ? 'hidden sm:block' : undefined}>
                <a
                  href={e.href}
                  title={e.title}
                  className="flex h-full min-h-tap items-center justify-center rounded-xl border border-rule-strong bg-paper px-2 text-center text-[15px] font-semibold leading-tight text-ink sm:text-base no-underline transition-colors duration-150 hover:border-saffron hover:bg-saffron-soft"
                >
                  {e.label}
                </a>
              </li>
            ))}
          </ul>
        </section>

        <p className="flex items-center gap-3 text-sm font-semibold text-muted md:hidden lg:flex xl:hidden" aria-hidden="true">
          <span className="h-px flex-1 bg-rule"></span>
          {tr('site.home.pathOr')}
          <span className="h-px flex-1 bg-rule"></span>
        </p>

        <section aria-labelledby="path-size-h" className={panel} data-path="size">
          <h2 id="path-size-h" className="flex items-center gap-2 text-lg font-bold text-ink">
            <span className={`${step} bg-saffron text-on-saffron`} aria-hidden="true">
              <Icon name="crop" size={16} />
            </span>
            {tr('site.home.pathSize')}
          </h2>
          <p className="mt-1 hidden text-sm text-muted sm:block">{tr('site.home.pathSizeHint')}</p>
          <ul className="mt-2 grid grid-cols-2 gap-2" data-size-tasks>
            {tasks.map((x) => (
              <li key={x.id}>
                <a
                  href={x.href}
                  data-task={x.id}
                  className="flex h-full min-h-[52px] items-center gap-2 rounded-xl border border-rule-strong bg-paper px-3 py-2 text-[15px] font-semibold leading-tight text-ink no-underline transition-colors duration-150 hover:border-saffron hover:bg-saffron-soft"
                >
                  <Icon name={x.icon} size={18} className="shrink-0 text-primary" />
                  <span className="min-w-0 flex-1">{x.label}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <p className="mt-3 flex items-start gap-2 text-sm text-chalk-text" data-privacy-line>
        <Icon name="shield" size={18} className="mt-px shrink-0 text-chalk" />
        <span>{CORE_PROMISE[lang === 'hi' ? 'hi' : 'en']}</span>
      </p>
    </>
  );
}
