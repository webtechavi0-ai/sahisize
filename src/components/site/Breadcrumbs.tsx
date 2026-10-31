/**
 * Visible breadcrumb trail. The matching BreadcrumbList JSON-LD is built by the page.
 *
 * Phones (< 640 px) get a short trail: a back arrow and the ancestors only (no "Home" when
 * there is a closer parent, no current page: the h1 says it). On an exam page that reads
 * "← Exams › RRB exams", so "all exams" stays one tap away. Wider screens show the full trail.
 */
import { t } from '@/i18n';
import type { Lang } from '@/config/site';
import type { Crumb } from '@/seo/jsonld';

interface Props {
  lang: Lang;
  crumbs: Crumb[];
}

const linkCls = 'inline-flex min-h-[48px] items-center text-muted hover:text-primary';

export default function Breadcrumbs({ lang, crumbs }: Props) {
  const ancestors = crumbs.slice(0, -1).filter((c) => c.path);
  const short = ancestors.length > 1 ? ancestors.slice(1) : ancestors;
  return (
    <nav aria-label={t(lang, 'site.breadcrumb.label')} className="mb-2 text-sm text-muted">
      <ol className="hidden flex-wrap items-center gap-x-1 sm:flex">
        {crumbs.map((c, i) => (
          <li key={i} className="inline-flex items-center gap-1">
            {i > 0 && <span aria-hidden="true">›</span>}
            {c.path && i < crumbs.length - 1 ? (
              <a href={c.path} className={linkCls}>
                {c.name}
              </a>
            ) : (
              <span aria-current="page">{c.name}</span>
            )}
          </li>
        ))}
      </ol>
      {short.length > 0 && (
        <ol className="flex items-center gap-x-1 sm:hidden" data-crumbs-short>
          {short.map((c, i) => (
            <li key={i} className="inline-flex min-w-0 items-center gap-1">
              {i > 0 && <span aria-hidden="true">›</span>}
              <a href={c.path} className={`${linkCls} gap-1 truncate font-semibold text-ink`}>
                {i === 0 && (
                  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M19 12H5" />
                    <path d="M12 19l-7-7 7-7" />
                  </svg>
                )}
                {c.name}
              </a>
            </li>
          ))}
        </ol>
      )}
    </nav>
  );
}
