import type { ReactNode } from 'react';
import '@/styles/global.css';
import { HTML_LANG, THEME_COLOR, THEME_COLOR_DARK, type Lang } from '@/config/site';
import ClientBoot from './ClientBoot';

const THEME_SCRIPT = `(function(){var d=false,r=document.documentElement;try{d=localStorage.getItem('sahisize:theme')==='dark';if(localStorage.getItem('sahisize:promo:exampilot:dismissed'))r.setAttribute('data-exampilot-dismissed','')}catch(e){}r.setAttribute('data-theme',d?'dark':'light');if(d){var m=document.querySelector('meta[name="theme-color"]');if(m&&m.dataset.dark)m.setAttribute('content',m.dataset.dark)}})();`;
const GTAG_SCRIPT = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','G-HWMGBKFKK9');`;

/** <html>/<head>/<body> shared by the English and Hindi root layouts. */
export default function RootShell({ lang, children }: { lang: Lang; children: ReactNode }) {
  return (
    <html lang={HTML_LANG[lang]} suppressHydrationWarning>
      <head>
        <meta name="theme-color" content={THEME_COLOR} data-light={THEME_COLOR} data-dark={THEME_COLOR_DARK} />
        <link rel="icon" href="/favicon.ico" sizes="48x48" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="preload" href="/fonts/inter-latin-400.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-HWMGBKFKK9" />
        <script dangerouslySetInnerHTML={{ __html: GTAG_SCRIPT }} />
      </head>
      <body className="min-h-screen-safe flex flex-col">
        {children}
        <ClientBoot />
      </body>
    </html>
  );
}
