import IdHub from '@/components/id-documents/IdHub';
import { ID_HUB_PATHS, getIdHubCopy } from '@/server/content';
import { buildMetadata } from '@/seo/metadata';

const lang = 'hi' as const;
const c = getIdHubCopy(lang)!;

export const metadata = buildMetadata({
  title: c.title,
  description: c.description,
  lang,
  path: ID_HUB_PATHS[lang],
  alternates: { en: ID_HUB_PATHS.en, hi: ID_HUB_PATHS.hi },
  ogImage: '/og/default.png',
});

export default function Page() {
  return <IdHub lang={lang} />;
}
