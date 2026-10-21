/**
 * Theme toggle (SPEC 3.2): flips <html data-theme> between light and dark and stores
 * the manual choice in localStorage 'sahisize:theme'. The pre-paint inline script in
 * Base.astro applies the stored or OS theme before first paint.
 */
export const THEME_KEY = 'sahisize:theme';

export type Theme = 'light' | 'dark';

export function currentTheme(): Theme {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

export function applyTheme(theme: Theme, persist = true): void {
  document.documentElement.setAttribute('data-theme', theme);
  if (persist) {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* storage blocked: choice lasts for this page only */
    }
  }
  const meta = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
  meta.forEach((m) => m.setAttribute('content', theme === 'dark' ? '#0B1220' : '#1E3A8A'));
  syncButtons();
}

function syncButtons(): void {
  const dark = currentTheme() === 'dark';
  document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]').forEach((b) => {
    const label = dark ? b.dataset.labelLight : b.dataset.labelDark;
    if (label) {
      b.setAttribute('aria-label', label);
      b.title = label;
    }
  });
}

let bound = false;
export function initThemeToggle(): void {
  if (bound) return;
  bound = true;
  syncButtons();
  document.addEventListener('click', (e) => {
    const btn = (e.target as Element | null)?.closest?.('[data-theme-toggle]');
    if (!btn) return;
    applyTheme(currentTheme() === 'dark' ? 'light' : 'dark');
  });
  // Follow OS changes only while the user has not chosen manually.
  try {
    const mq = matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener?.('change', (ev) => {
      let stored: string | null = null;
      try {
        stored = localStorage.getItem(THEME_KEY);
      } catch {
        /* ignore */
      }
      if (stored !== 'light' && stored !== 'dark') applyTheme(ev.matches ? 'dark' : 'light', false);
    });
  } catch {
    /* old browsers */
  }
}
