/**
 * /guides and /hi/guides. Lists non-draft guides of that language.
 * Page metadata (title/description) comes from the route's generateMetadata.
 */
import MainLayout from '@/components/layout/MainLayout';
import Breadcrumbs from './Breadcrumbs';
import { t, localizePath } from '@/i18n';
import type { Lang } from '@/config/site';
import { getGuides } from '@/content/loaders';
import { staticAlternates } from '@/seo/hreflang';
import { breadcrumbList } from '@/seo/jsonld';

interface Props {
  lang: Lang;
}

export default function GuidesIndex({ lang }: Props) {
  const tr = (k: string, v?: Record<string, string | number>) => t(lang, k, v);
  const guides = getGuides(lang)
    .filter((g) => !g.draft)
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
  const crumbs = [
    { name: tr('site.breadcrumb.home'), path: localizePath('/', lang) },
    { name: tr('site.breadcrumb.guides'), path: localizePath('/guides', lang) },
  ];
  return (
    <MainLayout lang={lang} alternates={staticAlternates('/guides')} jsonLd={[breadcrumbList(crumbs)]}>
      <Breadcrumbs lang={lang} crumbs={crumbs} />
      <h1 className="text-3xl font-bold">{tr('site.guides.h1')}</h1>
      <p className="mt-2 text-muted">{tr('site.guides.intro')}</p>
      {guides.length === 0 ? (
        <p className="card mt-6 p-4">{tr('site.guides.empty')}</p>
      ) : (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {guides.map((g) => (
            <li key={g.slug}>
              <a href={localizePath(`/guides/${g.slug}`, lang)} className="card flex h-full flex-col gap-1 p-4 no-underline hover:border-primary">
                <span className="text-lg font-bold text-primary">{g.title}</span>
                <span className="text-sm text-text">{g.description}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </MainLayout>
  );
}
