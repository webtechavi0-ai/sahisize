/** Legal and trust pages (SPEC 11.2): about, privacy, terms, disclaimer, contact. English only. */
import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import MainLayout from '@/components/layout/MainLayout';
import Breadcrumbs from '@/components/site/Breadcrumbs';
import { breadcrumbList } from '@/seo/jsonld';
import { buildMetadata } from '@/seo/metadata';
import { withSiteName } from '@/seo/text';
import { SITE_NAME } from '@/config/site';

export interface LegalLayoutProps {
  /** <title> text; " | SahiSize" is added unless it already names the site. */
  title: string;
  /** Visible H1 and breadcrumb name when it differs from `title`. */
  h1?: string;
  description: string;
  path: string;
  updated?: string;
  children?: ReactNode;
}

export function legalMetadata({ title, description, path }: LegalLayoutProps): Metadata {
  return buildMetadata({
    title: title.includes(SITE_NAME) ? title : withSiteName(title),
    lang: 'en',
    description,
    path,
    alternates: { en: path, hi: null },
  });
}

export default function LegalLayout({ title, h1, path, updated, children }: LegalLayoutProps) {
  const heading = h1 ?? title;
  const crumbs = [
    { name: 'Home', path: '/' },
    { name: heading, path },
  ];
  return (
    <MainLayout alternates={{ en: path, hi: null }} jsonLd={[breadcrumbList(crumbs)]}>
      <Breadcrumbs lang="en" crumbs={crumbs} />
      <article className="prose max-w-3xl dark:prose-invert prose-a:text-primary">
        <h1>{heading}</h1>
        {updated && <p className="text-sm text-muted">Last updated: {updated}</p>}
        {children}
      </article>
    </MainLayout>
  );
}
