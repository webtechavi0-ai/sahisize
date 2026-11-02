'use client';
/**
 * Manual theme toggle (SPEC 3.2/6.1). The pre-paint script in the root layout sets
 * <html data-theme>; src/lib/theme.ts flips it and stores the choice.
 */
import { useEffect } from 'react';
import Icon from './Icon';
import { initThemeToggle } from '@/lib/theme';

interface Props {
  /** Labels are resolved on the server so this client component carries no dictionary. */
  label: string;
  toDark: string;
  toLight: string;
}

export default function ThemeToggle({ label, toDark, toLight }: Props) {
  useEffect(() => {
    initThemeToggle();
  }, []);
  return (
    <button
      type="button"
      data-theme-toggle
      data-label-dark={toDark}
      data-label-light={toLight}
      aria-label={label}
      title={label}
      className="inline-flex h-tap w-tap items-center justify-center rounded-card text-text hover:bg-bg"
    >
      <Icon name="moon" className="dark:hidden" />
      <Icon name="sun" className="hidden dark:block" />
    </button>
  );
}
