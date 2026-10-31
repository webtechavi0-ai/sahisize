/**
 * Theme toggle (SPEC 3.2): flips <html data-theme> between light and dark and stores
 * the manual choice in localStorage 'sahisize:theme'. The pre-paint inline script in
 * RootShell applies the stored choice before first paint. With nothing stored the site is
 * LIGHT, whatever the OS prefers (the OS preference is deliberately not followed).
 */
export const THEME_KEY = 'sahisize:theme';

export type Theme = 'light' | 'dark';

export function currentTheme(): Theme {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

export function applyTheme(theme: Theme, persist = true): void {
  // Store first, so a navigation right after the click already paints with the new theme.
  if (persist) {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* storage blocked: choice lasts for this page only */
    }
  }
  document.documentElement.setAttribute('data-theme', theme);
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => {
    const next = theme === 'dark' ? m.dataset.dark : m.dataset.light;
    if (next) m.setAttribute('content', next);
  });
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
}
