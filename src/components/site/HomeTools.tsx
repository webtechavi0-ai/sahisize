/**
 * Home "Photo, signature and document tools": one grouped list ("By document" first, then by
 * file size, then PDF) instead of separate card grids. Each group is a <details data-open-md>:
 * on phones only "By document" starts open (short page); from 768 px every group shows open
 * (CSS, HeaderClient fallback). Closed groups keep their links in the HTML. The "Other
 * documents" entries keep their spec line and data-other-doc hooks.
 */
import Icon, { type SiteIconName } from './Icon';
import { t } from '@/i18n/server';
import { localizePath, type Lang } from '@/i18n/config';

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
  groups: { id: string; title: string; icon: SiteIconName; rows: ToolRow[] }[];
}

export default function HomeTools({ lang, groups }: Props) {
  return (
    <section aria-labelledby="tools-h" className="w-full py-8 sm:py-14 lg:py-20" data-home-tools data-other-docs>
      <div className="flex items-center justify-between gap-4">
        <h2 id="tools-h" className="text-h2">
          {t(lang, 'site.home.tools')}
        </h2>
        <a
          href={localizePath('/tools', lang)}
          className="inline-flex min-h-tap shrink-0 items-center gap-1 rounded-xl px-2 text-[15px] font-semibold text-ink no-underline hover:bg-ink-soft"
        >
          {t(lang, 'site.home.allTools')}
          <Icon name="arrowRight" size={16} className="shrink-0" />
        </a>
      </div>
      {/* From 768 px: "By document" (the long list) fills the left column across two rows and the
          shorter groups stack on the right, so both column bottoms end level (no masonry holes). */}
      <div className="mt-4 grid items-start gap-3 sm:mt-6 md:grid-cols-2 md:gap-4 lg:gap-6">
        {groups.map((g, i) => (
          <details
            key={g.id}
            open={i === 0}
            data-open-md
            data-tool-group={g.id}
            className={`card group overflow-hidden shadow-e1${i === 0 && groups.length > 2 ? ' md:row-span-2' : ''}`}
          >
            <summary className="flex min-h-[56px] cursor-pointer list-none items-center gap-3 px-4 [&::-webkit-details-marker]:hidden md:border-b md:border-rule">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink-soft text-ink" aria-hidden="true">
                <Icon name={g.icon} size={18} />
              </span>
              <h3 id={`tools-${g.id}-h`} className="text-h3">
                {g.title}
              </h3>
              <span className="num ml-auto text-sm text-muted">{g.rows.length}</span>
              <Icon name="chevronDown" size={20} className="shrink-0 text-muted transition-transform group-open:rotate-180 md:hidden" />
            </summary>
            <ul aria-labelledby={`tools-${g.id}-h`} className="divide-y divide-rule border-t border-rule md:border-t-0">
              {g.rows.map((r) => (
                <li key={r.href}>
                  <a
                    href={r.href}
                    data-other-doc={r.doc}
                    className="flex min-h-[52px] items-center gap-3 px-4 py-2.5 no-underline transition-colors duration-150 hover:bg-ink-soft"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold leading-snug text-heading">{r.name}</span>
                      {r.spec && <span className="num block text-sm text-muted">{r.spec}</span>}
                      {r.note && <span className="block text-xs text-muted">{r.note}</span>}
                    </span>
                    <Icon name="arrowRight" size={16} className="shrink-0 text-muted" />
                  </a>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>
    </section>
  );
}
