/**
 * Site header (SPEC 6.1): logo, main links (Exams, Tools, Govt ID, Guides), site search
 * (ExamSearch island, `variant="header"`: an icon on phones that opens a full-screen search,
 * inline on wider screens), EN/हिं toggle, theme toggle, and below 1024px a Menu disclosure
 * with the same links (current page marked), language and theme as large rows.
 *
 * Pages with their own big search box (home, 404) pass hideSearch: the header icon then
 * jumps to and focuses that box instead of loading a second copy of the search data.
 * Without JS the search form submits to /exams?q= (desktop), which filters the list.
 * The current-page marking lives in HeaderClient (usePathname).
 */
import ExamSearch from '@/islands/ExamSearch';
import { searchIslandProps } from '@/lib/nav-data';
import { localHref } from '@/seo/localize-href';
import LangToggle from './LangToggle';
import ThemeToggle from './ThemeToggle';
import Icon from './Icon';
import { HeaderDesktopLinks, HeaderMenuLinks, HeaderSearchIconLink, type HeaderLink, type NavIcon } from './HeaderClient';
import { t } from '@/i18n';
import type { Lang } from '@/config/site';
import type { Alternates } from '@/seo/hreflang';

interface Props {
  lang: Lang;
  alternates?: Alternates;
  /** The page has its own big search box (home, 404). */
  hideSearch?: boolean;
}

// Small inline icons (lucide paths) so the menu does not depend on the shared Icon set.
const ICONS: Record<NavIcon | 'lang' | 'moon' | 'sun' | 'chevron', string[]> = {
  exams: ['M21.42 10.92a1 1 0 0 0-.02-1.84L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.83l8.57 3.91a2 2 0 0 0 1.66 0z', 'M22 10v6', 'M6 12.5V16a6 3 0 0 0 12 0v-3.5'],
  tools: ['M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z'],
  id: ['M16 10h2', 'M16 14h2', 'M6.17 15a3 3 0 0 1 5.66 0', 'M9 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4z', 'M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z'],
  guides: ['M12 7v14', 'M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z'],
  lang: ['M5 8l6 6', 'M4 14l6-6 2-3', 'M2 5h12', 'M7 2h1', 'M22 22l-5-10-5 10', 'M14 18h6'],
  moon: ['M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z'],
  sun: ['M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M12 2v2', 'M12 20v2', 'M4.93 4.93l1.41 1.41', 'M17.66 17.66l1.41 1.41', 'M2 12h2', 'M20 12h2', 'M6.34 17.66l-1.41 1.41', 'M19.07 4.93l-1.41 1.41'],
  chevron: ['M9 18l6-6-6-6'],
};
const rowCls = 'flex min-h-[56px] items-center gap-3 rounded-xl px-3 text-base font-semibold no-underline';
const svgProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const;

export default async function Header({ lang, alternates, hideSearch = false }: Props) {
  const home = localHref('/', lang);
  const examsHref = localHref('/exams', lang);
  const search = hideSearch ? null : await searchIslandProps(lang);

  const links: HeaderLink[] = [
    { href: examsHref, label: t(lang, 'site.header.exams'), icon: 'exams', exact: ['/exams'], prefixes: ['/exams/', '/exam/', '/kit/'] },
    { href: localHref('/tools', lang), label: t(lang, 'site.header.tools'), icon: 'tools', exact: ['/tools'], prefixes: ['/tools/'] },
    { href: localHref('/id-documents', lang), label: t(lang, 'ui.search.cat.govtId'), icon: 'id', exact: ['/id-documents'], prefixes: ['/id-documents/'] },
    { href: localHref('/guides', lang), label: t(lang, 'site.header.guides'), icon: 'guides', exact: ['/guides'], prefixes: ['/guides/'] },
  ];
  const langTarget: Lang = lang === 'hi' ? 'en' : 'hi';
  const langHref = langTarget === 'hi' ? (alternates?.hi ?? '/hi') : (alternates?.en ?? '/');

  return (
    <header className="relative z-30 border-b border-rule bg-card">
      <div className="container-fluid flex min-h-[56px] items-center gap-1 py-1">
        <a
          href={home}
          className="mr-auto inline-flex min-h-tap shrink-0 items-center gap-2 font-bold no-underline"
          aria-label={t(lang, 'site.header.home')}
        >
          <img src="/icon.svg" width="32" height="32" alt="" className="h-7 w-7 sm:h-8 sm:w-8" />
          <span className="text-lg sm:text-xl" lang="en">
            <span className="text-saffron-text">Sahi</span>
            <span className="text-ink">Size</span>
          </span>
        </a>
        <nav aria-label={t(lang, 'site.header.nav')} className="hidden lg:block">
          <HeaderDesktopLinks links={links} />
        </nav>
        {search ? (
          <div className="lg:ml-2">
            <ExamSearch variant="header" {...search} />
          </div>
        ) : (
          <HeaderSearchIconLink href={examsHref} label={t(lang, 'ui.search.open')}>
            <Icon name="search" />
          </HeaderSearchIconLink>
        )}
        <LangToggle lang={lang} alternates={alternates} />
        <ThemeToggle lang={lang} />
        {/*
          Phone/tablet menu: an accessible disclosure (<details>/<summary>), not a modal
          (SPEC 6.1 allows no modals except "Start over?"). Works without JS; HeaderMenuLinks
          only closes it on Escape or outside click.
        */}
        <details className="group lg:hidden" data-nav-menu>
          <summary
            className="inline-flex h-tap w-tap cursor-pointer list-none items-center justify-center rounded-xl text-ink hover:bg-paper group-open:bg-saffron-soft [&::-webkit-details-marker]:hidden"
            aria-label={t(lang, 'site.header.menu')}
            title={t(lang, 'site.header.menu')}
          >
            <Icon name="menu" className="group-open:hidden" />
            <Icon name="x" className="hidden group-open:block" />
          </summary>
          <nav
            aria-label={t(lang, 'site.header.nav')}
            className="absolute inset-x-0 top-full hidden max-h-[calc(100dvh-56px)] overflow-auto border-b border-rule bg-card shadow-lift group-open:block"
          >
            <HeaderMenuLinks links={links} icons={ICONS} chevron={ICONS.chevron}>
              <li className="!mt-3 border-t border-rule pt-3">
                <a
                  href={langHref}
                  hrefLang={langTarget === 'hi' ? 'hi-IN' : 'en-IN'}
                  lang={langTarget}
                  className={`${rowCls} text-text hover:bg-paper hover:text-ink`}
                  data-menu-lang
                >
                  <svg {...svgProps} className="h-6 w-6 shrink-0">
                    {ICONS.lang.map((d) => (
                      <path key={d} d={d} />
                    ))}
                  </svg>
                  <span className={`flex-1${langTarget === 'hi' ? ' [font-family:system-ui,sans-serif]' : ''}`}>
                    {langTarget === 'hi' ? t(lang, 'site.lang.toHindi') : t(lang, 'site.lang.toEnglish')}
                  </span>
                </a>
              </li>
              <li>
                <button
                  type="button"
                  data-theme-toggle
                  data-label-dark={t(lang, 'site.theme.toDark')}
                  data-label-light={t(lang, 'site.theme.toLight')}
                  className={`${rowCls} w-full text-left text-text hover:bg-paper hover:text-ink`}
                >
                  <svg {...svgProps} className="h-6 w-6 shrink-0 dark:hidden">
                    {ICONS.moon.map((d) => (
                      <path key={d} d={d} />
                    ))}
                  </svg>
                  <svg {...svgProps} className="hidden h-6 w-6 shrink-0 dark:block">
                    {ICONS.sun.map((d) => (
                      <path key={d} d={d} />
                    ))}
                  </svg>
                  <span className="flex-1 dark:hidden">{t(lang, 'site.theme.toDark')}</span>
                  <span className="hidden flex-1 dark:inline">{t(lang, 'site.theme.toLight')}</span>
                </button>
              </li>
            </HeaderMenuLinks>
          </nav>
        </details>
      </div>
    </header>
  );
}
