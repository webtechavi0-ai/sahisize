'use client';
/**
 * Client pieces of the Header: nav links that mark the current page (usePathname), and the
 * behaviours of the old inline <script> (close the menu on Escape / outside click; the
 * header search icon focuses the page's big search box on home and 404).
 */
import { useEffect, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';

export type NavIcon = 'exams' | 'tools' | 'id' | 'guides';
export interface HeaderLink {
  href: string;
  label: string;
  icon: NavIcon;
  /** Bare (non-localized) path prefixes that mark this link current. */
  exact: string[];
  prefixes: string[];
}

const rowCls = 'flex min-h-[56px] items-center gap-3 rounded-xl px-3 text-base font-semibold no-underline';

function useBarePath(): string {
  const raw = usePathname() ?? '/';
  const path = raw.replace(/\.html$/, '').replace(/(.)\/$/, '$1');
  return path.replace(/^\/hi(?=\/|$)/, '') || '/';
}

function isCurrent(l: HeaderLink, bare: string): boolean {
  return l.exact.includes(bare) || l.prefixes.some((p) => bare.startsWith(p));
}

function Svg({ paths, className }: { paths: string[]; className: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

/** Desktop nav list items (>= 1024px). */
export function HeaderDesktopLinks({ links }: { links: HeaderLink[] }) {
  const bare = useBarePath();
  return (
    <ul className="flex items-center gap-1">
      {links.map((l) => {
        const current = isCurrent(l, bare);
        return (
          <li key={l.href}>
            <a
              className={`inline-flex min-h-tap items-center rounded-xl px-3 font-semibold no-underline hover:bg-saffron-soft hover:text-ink ${
                current ? 'bg-saffron-soft text-ink underline decoration-saffron decoration-[3px] underline-offset-[6px]' : 'text-text'
              }`}
              href={l.href}
              aria-current={current ? 'page' : undefined}
            >
              {l.label}
            </a>
          </li>
        );
      })}
    </ul>
  );
}

/** Phone/tablet menu rows; `children` are the language and theme rows rendered by the server. */
export function HeaderMenuLinks({
  links,
  icons,
  chevron,
  children,
}: {
  links: HeaderLink[];
  icons: Record<NavIcon, string[]>;
  chevron: string[];
  children: ReactNode;
}) {
  const bare = useBarePath();
  useEffect(() => {
    const menus = Array.from(document.querySelectorAll<HTMLDetailsElement>('details[data-nav-menu]'));
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      for (const menu of menus) {
        if (menu.open) {
          menu.open = false;
          menu.querySelector('summary')?.focus();
        }
      }
    };
    const onClick = (e: MouseEvent) => {
      for (const menu of menus) {
        if (menu.open && !menu.contains(e.target as Node)) menu.open = false;
      }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('click', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('click', onClick);
    };
  }, []);
  return (
    <ul className="container-fluid space-y-1 py-3">
      {links.map((l) => {
        const current = isCurrent(l, bare);
        return (
          <li key={l.href}>
            <a
              className={`${rowCls} ${
                current
                  ? 'bg-saffron-soft text-ink shadow-[inset_4px_0_0_rgb(var(--saffron))]'
                  : 'text-text hover:bg-paper hover:text-ink'
              }`}
              href={l.href}
              aria-current={current ? 'page' : undefined}
            >
              <Svg paths={icons[l.icon]} className="h-6 w-6 shrink-0" />
              <span className="flex-1">{l.label}</span>
              <Svg paths={chevron} className="h-5 w-5 shrink-0 text-muted" />
            </a>
          </li>
        );
      })}
      {children}
    </ul>
  );
}

/** Home / 404: the header search icon focuses the page's big search box. */
export function HeaderSearchIconLink({ href, label, children }: { href: string; label: string; children: ReactNode }) {
  useEffect(() => {
    const a = document.querySelector<HTMLAnchorElement>('a[data-focus-hero-search]');
    if (!a) return;
    const onClick = (e: MouseEvent) => {
      const input = document.querySelector<HTMLInputElement>('[data-site-search="hero"] input[role="combobox"]');
      if (!input) return;
      e.preventDefault();
      if (!window.matchMedia('(max-width: 639px)').matches) input.scrollIntoView({ block: 'center' });
      input.focus();
      input.click();
    };
    a.addEventListener('click', onClick);
    return () => a.removeEventListener('click', onClick);
  }, []);
  return (
    <a
      href={href}
      data-focus-hero-search
      className="inline-flex h-tap w-tap items-center justify-center rounded-xl text-ink hover:bg-paper"
      aria-label={label}
      title={label}
    >
      {children}
    </a>
  );
}
