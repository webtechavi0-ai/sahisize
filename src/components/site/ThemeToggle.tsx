'use client';
/**
 * Manual theme toggle (SPEC 3.2/6.1). The pre-paint script in the root layout sets
 * <html data-theme>; src/scripts/theme.ts flips it and stores the choice.
 */
import { useEffect } from 'react';
import Icon from './Icon';
import { t } from '@/i18n';
import type { Lang } from '@/config/site';
import { initThemeToggle } from '@/scripts/theme';

export default function ThemeToggle({ lang }: { lang: Lang }) {
  useEffect(() => {
    initThemeToggle();
  }, []);
  return (
    <button
      type="button"
      data-theme-toggle
      data-label-dark={t(lang, 'site.theme.toDark')}
      data-label-light={t(lang, 'site.theme.toLight')}
      aria-label={t(lang, 'common.theme.toggle')}
      title={t(lang, 'common.theme.toggle')}
      className="inline-flex h-tap w-tap items-center justify-center rounded-card text-text hover:bg-bg"
    >
      <Icon name="moon" className="dark:hidden" />
      <Icon name="sun" className="hidden dark:block" />
    </button>
  );
}
