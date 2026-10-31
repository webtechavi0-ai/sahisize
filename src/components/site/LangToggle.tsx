/**
 * EN / हिं switch (SPEC 6.1). Links to the counterpart page when it exists,
 * otherwise to the other language's home (PLAN 3.11). The accessible name starts with the
 * visible "EN"/"हि" (axe label-content-name-mismatch), the rest is screen-reader only.
 */
import { t } from '@/i18n';
import type { Lang } from '@/config/site';
import type { Alternates } from '@/seo/hreflang';

interface Props {
  lang: Lang;
  alternates?: Alternates;
}

export default function LangToggle({ lang, alternates }: Props) {
  const target: Lang = lang === 'hi' ? 'en' : 'hi';
  const href = target === 'hi' ? (alternates?.hi ?? '/hi') : (alternates?.en ?? '/');
  const label = target === 'hi' ? t(lang, 'site.lang.toHindi') : t(lang, 'site.lang.toEnglish');
  // On English pages the only Devanagari is this toggle: render it in the system font so the
  // 54 KB Noto Sans Devanagari face is not downloaded for two glyphs (PLAN 3.16, LCP).
  const systemFont = target === 'hi' ? ' [font-family:system-ui,sans-serif]' : '';
  return (
    <a
      href={href}
      hrefLang={target === 'hi' ? 'hi-IN' : 'en-IN'}
      lang={target === 'hi' ? 'hi' : 'en'}
      title={label}
      className={`inline-flex h-tap min-w-tap items-center justify-center rounded-card px-2 font-semibold text-primary no-underline hover:bg-bg${systemFont}`}
    >
      {t(target, `site.lang.short.${target}`)}
      <span className="sr-only"> — {label}</span>
    </a>
  );
}
