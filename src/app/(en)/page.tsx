import type { Metadata } from 'next';
import HomePage from '@/components/site/HomePage';
import { t } from '@/i18n/server';
import { buildMetadata } from '@/seo/metadata';
import { alternatesFor } from '@/server/content';

export const dynamic = 'force-static';

export function generateMetadata(): Metadata {
  return buildMetadata({
    title: t('en', 'site.home.title'),
    description: t('en', 'site.home.description'),
    lang: 'en',
    path: '/',
    alternates: alternatesFor('/'),
    ogImage: '/og/home.png',
  });
}

export default function Page() {
  return <HomePage lang="en" />;
}
