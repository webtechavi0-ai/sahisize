import type { ReactNode } from 'react';
import type { Lang } from '@/config/site';
import { t } from '@/i18n';
import Header from '@/components/site/Header';
import Footer from '@/components/site/Footer';
import type { Alternates } from '@/seo/hreflang';
import type { JsonLd } from '@/seo/jsonld';
import { JsonLdScripts } from './JsonLdScripts';

export interface MainLayoutProps {
  lang?: Lang;
  /** en/hi counterparts for the language toggle. */
  alternates?: Alternates;
  jsonLd?: (JsonLd | null | undefined)[];
  /** 'minimal' drops header/footer (kit flow, SPEC 6.4). */
  chrome?: 'full' | 'minimal';
  hideSearch?: boolean;
  /** Extra classes for <main>. */
  mainClass?: string;
  /** Rendered between the header and <main> (old `top` slot). */
  top?: ReactNode;
  children: ReactNode;
}

/** The one site layout: skip link, header, <main>, footer. SEO tags come from buildMetadata. */
export default function MainLayout({
  lang = 'en',
  alternates,
  jsonLd,
  chrome = 'full',
  hideSearch = false,
  mainClass = 'container-fluid flex-1 py-6',
  top,
  children,
}: MainLayoutProps) {
  return (
    <>
      <JsonLdScripts blocks={jsonLd} />
      <a href="#main" className="sr-only-focusable absolute left-2 top-2 z-50 rounded-card bg-card p-3">
        {t(lang, 'common.skipToContent')}
      </a>
      {chrome === 'full' && <Header lang={lang} alternates={alternates} hideSearch={hideSearch} />}
      {top}
      <main id="main" className={mainClass}>
        {children}
      </main>
      {chrome === 'full' && <Footer lang={lang} />}
    </>
  );
}
