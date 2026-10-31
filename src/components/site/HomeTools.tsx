/**
 * Home "Photo, signature and document tools": one grouped list (by file size, by document,
 * PDF) instead of separate card grids. Rows, not cards, so it reads differently from the exam
 * grid. The "Other documents" entries keep their spec line and data-other-doc hooks.
 */
import Icon from './Icon';
import { t, localizePath } from '@/i18n';
import type { Lang } from '@/config/site';

export interface ToolRow {
  href: string;
  name: string;
  spec?: string;
  note?: string | null;
  /** data-other-doc id (Other documents entries). */
  doc?: string;
}
interface Props {
  lang: Lang;
  groups: { id: string; title: string; rows: ToolRow[] }[];
}

export default function HomeTools({ lang, groups }: Props) {
  return (
    <section aria-labelledby="tools-h" className="mt-12" data-home-tools data-other-docs>
      <div className="flex items-center justify-between gap-2">
        <h2 id="tools-h" className="text-xl font-bold">
          {t(lang, 'site.home.tools')}
        </h2>
        <a href={localizePath('/tools', lang)} className="inline-flex min-h-tap items-center text-sm font-semibold">
          {t(lang, 'site.home.allTools')}
        </a>
      </div>
      <div className="mt-3 grid items-start gap-4 md:grid-cols-2 lg:grid-cols-3">
        {groups.map((g) => (
          <section key={g.id} aria-labelledby={`tools-${g.id}-h`} className="card overflow-hidden" data-tool-group={g.id}>
            <h3
              id={`tools-${g.id}-h`}
              className="border-b border-rule bg-paper px-4 py-2 text-sm font-bold uppercase tracking-wide text-muted"
            >
              {g.title}
            </h3>
            <ul className="divide-y divide-rule">
              {g.rows.map((r) => (
                <li key={r.href}>
                  <a
                    href={r.href}
                    data-other-doc={r.doc}
                    className="flex min-h-tap items-center gap-3 px-4 py-2.5 no-underline transition-colors duration-150 hover:bg-saffron-soft"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-primary">{r.name}</span>
                      {r.spec && <span className="block text-sm text-text">{r.spec}</span>}
                      {r.note && <span className="block text-xs text-muted">{r.note}</span>}
                    </span>
                    <Icon name="arrowRight" size={18} className="shrink-0 text-muted" />
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </section>
  );
}
