import type { Metadata } from 'next';
import ExamsIndex from '@/components/site/ExamsIndex';
import { t } from '@/i18n/server';
import { publishedPresets } from '@/server/content';
import { buildMetadata } from '@/seo/metadata';
import { alternatesFor } from '@/server/content';

export const dynamic = 'force-static';

export function generateMetadata(): Metadata {
  return buildMetadata({
    title: t('en', 'site.exams.title'),
    description: t('en', 'site.exams.description', { count: publishedPresets().length }),
    lang: 'en',
    path: '/exams',
    alternates: alternatesFor('/exams'),
    ogImage: '/og/exams.png',
  });
}

export default function Page() {
  return <ExamsIndex lang="en" />;
}
