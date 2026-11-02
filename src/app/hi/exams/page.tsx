import type { Metadata } from 'next';
import ExamsIndex from '@/components/site/ExamsIndex';
import { t } from '@/i18n/server';
import { publishedPresets } from '@/server/content';
import { buildMetadata } from '@/seo/metadata';
import { alternatesFor } from '@/server/content';

export const dynamic = 'force-static';

export function generateMetadata(): Metadata {
  return buildMetadata({
    title: t('hi', 'site.exams.title'),
    description: t('hi', 'site.exams.description', { count: publishedPresets().length }),
    lang: 'hi',
    path: '/hi/exams',
    alternates: alternatesFor('/exams'),
    ogImage: '/og/exams.png',
  });
}

export default function Page() {
  return <ExamsIndex lang="hi" />;
}
