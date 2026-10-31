import EditorialPolicy from '@/components/site/EditorialPolicy';
import { buildMetadata } from '@/seo/metadata';

export const metadata = buildMetadata({
  title: 'Editorial Policy: How We Source Exam Sizes | SahiSize',
  description:
    'How SahiSize takes exam photo and signature sizes from official notices, checks and dates them, labels unconfirmed sizes and fixes reported mistakes.',
  lang: 'en',
  canonicalPath: '/editorial-policy',
  alternates: { en: '/editorial-policy', hi: '/hi/editorial-policy' },
});

export default function Page() {
  return <EditorialPolicy lang="en" />;
}
