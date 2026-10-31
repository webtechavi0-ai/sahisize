import type { Metadata } from 'next';
import HomePage from '@/components/site/HomePage';
import { t } from '@/i18n';
import { buildMetadata } from '@/seo/metadata';
import { staticAlternates } from '@/seo/hreflang';

export const dynamic = 'force-static';

export function generateMetadata(): Metadata {
  return buildMetadata({
    title: t('en', 'site.home.title'),
    description: t('en', 'site.home.description'),
    lang: 'en',
    canonicalPath: '/',
    alternates: staticAlternates('/'),
    ogImage: '/og/home.png',
  });
}

export default function Page() {
  return <HomePage lang="en" />;
}
