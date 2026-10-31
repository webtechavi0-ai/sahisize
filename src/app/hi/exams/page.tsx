import type { Metadata } from 'next';
import ExamsIndex from '@/components/site/ExamsIndex';
import { t } from '@/i18n';
import { getPublishedPresets } from '@/content/presets';
import { buildMetadata } from '@/seo/metadata';
import { staticAlternates } from '@/seo/hreflang';

export const dynamic = 'force-static';

export function generateMetadata(): Metadata {
  return buildMetadata({
    title: t('hi', 'site.exams.title'),
    description: t('hi', 'site.exams.description', { count: getPublishedPresets().length }),
    lang: 'hi',
    canonicalPath: '/hi/exams',
    alternates: staticAlternates('/exams'),
    ogImage: '/og/exams.png',
  });
}

export default function Page() {
  return <ExamsIndex lang="hi" />;
}
