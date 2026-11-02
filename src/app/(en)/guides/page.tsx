import GuidesIndex from '@/components/site/GuidesIndex';
import { t } from '@/i18n/server';
import { localizePath } from '@/i18n/config';
import { buildMetadata } from '@/seo/metadata';
import { alternatesFor } from '@/server/content';

const lang = 'en' as const;

export const metadata = buildMetadata({
  title: t(lang, 'site.guides.title'),
  description: t(lang, 'site.guides.description'),
  lang,
  path: localizePath('/guides', lang),
  alternates: alternatesFor('/guides'),
  ogImage: '/og/guides.png',
});

export default function Page() {
  return <GuidesIndex lang={lang} />;
}
