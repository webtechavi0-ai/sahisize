import IdHub from '@/components/id-documents/IdHub';
import { hubCopy } from '@/components/id-documents/copy';
import { ID_HUB } from '@/config/id-documents';
import { buildMetadata } from '@/seo/metadata';

const lang = 'en' as const;
const c = hubCopy(lang);

export const metadata = buildMetadata({
  title: c.title,
  description: c.description,
  lang,
  canonicalPath: ID_HUB[lang],
  alternates: { en: ID_HUB.en, hi: ID_HUB.hi },
  ogImage: '/og/default.png',
});

export default function Page() {
  return <IdHub lang={lang} />;
}
