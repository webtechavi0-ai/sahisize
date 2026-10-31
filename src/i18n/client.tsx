'use client';
/**
 * Client-side translations. The provider holds ONLY the namespaces a server component
 * passed in (`getMessages(lang, ['kit', 'common'])` from '@/i18n/server').
 *
 *   <I18nProvider lang={lang} messages={getMessages(lang, ['kit', 'common'])}>…</I18nProvider>
 *   const t = useT('kit');  t('upload.title')        // or useT()('kit.upload.title')
 *   const lang = useLang();
 */
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { DEFAULT_LANG, type Lang } from './config';
import { createT, scopeT, type Dict, type TFunction } from './core';

export { createT, interpolate, plural, scopeT, type Dict, type TFunction, type Vars } from './core';

type Messages = Record<string, Dict | undefined>;

interface I18nValue {
  lang: Lang;
  t: TFunction;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({
  lang,
  messages,
  children,
}: {
  lang: Lang;
  messages: Messages;
  children: ReactNode;
}) {
  const value = useMemo<I18nValue>(() => {
    const dict: Dict = {};
    for (const [ns, d] of Object.entries(messages)) if (d) dict[ns] = d;
    return { lang, t: createT(dict) };
  }, [lang, messages]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

function useI18n(): I18nValue {
  const v = useContext(I18nContext);
  if (!v) throw new Error('useT/useLang must be used inside <I18nProvider>');
  return v;
}

/** Translator from the nearest provider; with `ns`, keys are relative to that namespace. */
export function useT(ns?: string): TFunction {
  const { t } = useI18n();
  return useMemo(() => scopeT(t, ns), [t, ns]);
}

export function useLang(): Lang {
  return useContext(I18nContext)?.lang ?? DEFAULT_LANG;
}
