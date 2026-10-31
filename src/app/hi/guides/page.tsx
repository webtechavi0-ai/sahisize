import GuidesIndex from '@/components/site/GuidesIndex';
import { t, localizePath } from '@/i18n';
import { staticAlternates } from '@/seo/hreflang';
import { buildMetadata } from '@/seo/metadata';

const lang = 'hi' as const;

export const metadata = buildMetadata({
  title: t(lang, 'site.guides.title'),
  description: t(lang, 'site.guides.description'),
  lang,
  canonicalPath: localizePath('/guides', lang),
  alternates: staticAlternates('/guides'),
  ogImage: '/og/guides.png',
});

export default function Page() {
  return <GuidesIndex lang={lang} />;
}
