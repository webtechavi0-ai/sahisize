/**
 * Visible breadcrumb trail. The matching BreadcrumbList JSON-LD is built by the page.
 *
 * One list for every width (so crawlers and screen readers get the trail once). Phones
 * (< 640 px) hide some items with CSS: a back arrow and the ancestors only (no "Home" when
 * there is a closer parent, no current page: the h1 says it). On an exam page that reads
 * "← Exams › RRB exams", so "all exams" stays one tap away. Wider screens show the full trail.
 */
import type { Crumb } from '@/seo/jsonld';
import { t } from '@/i18n/server';
import { type Lang } from '@/i18n/config';
import { phoneCrumbs } from './breadcrumbs-view';

interface Props {
  lang: Lang;
  crumbs: Crumb[];
}

const linkCls = 'inline-flex min-h-[48px] items-center text-muted hover:text-primary';
const phoneLinkCls = 'max-sm:min-w-0 max-sm:gap-1 max-sm:truncate max-sm:font-semibold max-sm:text-ink';

export default function Breadcrumbs({ lang, crumbs }: Props) {
  const { onPhone, firstOnPhone } = phoneCrumbs(crumbs);
  return (
    <nav aria-label={t(lang, 'site.breadcrumb.label')} className="mb-2 text-sm text-muted">
      <ol className="flex items-center gap-x-1 sm:flex-wrap">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          const phone = onPhone[i];
          return (
            <li key={i} className={phone ? 'inline-flex min-w-0 items-center gap-1' : 'hidden items-center gap-1 sm:inline-flex'}>
              {i > 0 && (
                <span aria-hidden="true" className={i === firstOnPhone ? 'hidden sm:inline' : undefined}>
                  ›
                </span>
              )}
              {c.path && !last ? (
                <a href={c.path} className={phone ? `${linkCls} ${phoneLinkCls}` : linkCls}>
                  {i === firstOnPhone && (
                    <svg className="h-4 w-4 shrink-0 sm:hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M19 12H5" />
                      <path d="M12 19l-7-7 7-7" />
                    </svg>
                  )}
                  {c.name}
                </a>
              ) : (
                <span aria-current={last ? 'page' : undefined}>{c.name}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
