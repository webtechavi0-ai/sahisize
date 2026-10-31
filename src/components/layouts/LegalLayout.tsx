/** Legal and trust pages (SPEC 11.2): about, privacy, terms, disclaimer, contact. English only. */
import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import MainLayout from '@/components/layout/MainLayout';
import Breadcrumbs from '@/components/site/Breadcrumbs';
import { breadcrumbList } from '@/seo/jsonld';
import { withSiteName } from '@/seo/meta';
import { buildMetadata } from '@/seo/metadata';

export interface LegalLayoutProps {
  title: string;
  description: string;
  path: string;
  updated?: string;
  children?: ReactNode;
}

export function legalMetadata({ title, description, path }: LegalLayoutProps): Metadata {
  return buildMetadata({
    title: withSiteName(title),
    description,
    canonicalPath: path,
    alternates: { en: path, hi: null },
  });
}

export default function LegalLayout({ title, path, updated, children }: LegalLayoutProps) {
  const crumbs = [
    { name: 'Home', path: '/' },
    { name: title, path },
  ];
  return (
    <MainLayout alternates={{ en: path, hi: null }} jsonLd={[breadcrumbList(crumbs)]}>
      <Breadcrumbs lang="en" crumbs={crumbs} />
      <article className="prose max-w-3xl dark:prose-invert prose-a:text-primary">
        <h1>{title}</h1>
        {updated && <p className="text-sm text-muted">Last updated: {updated}</p>}
        {children}
      </article>
    </MainLayout>
  );
}
