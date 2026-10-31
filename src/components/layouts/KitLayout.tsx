/**
 * Full-screen kit layout (SPEC 6.4): minimal header (back, exam name, step count),
 * no footer, no distractions. The KitFlow island fills <main>.
 */
import type { Metadata } from 'next';
import MainLayout from '@/components/layout/MainLayout';
import Icon from '@/components/site/Icon';
import KitSlot from '@/components/site/KitSlot';
import { t } from '@/i18n';
import { plural } from '@/i18n/core';
import type { Lang } from '@/config/site';
import type { ExamPreset } from '@/content/presets/schema';
import { getKitDocuments } from '@/content/presets';
import { hasHindiExam } from '@/seo/hreflang';
import { breadcrumbList } from '@/seo/jsonld';
import { ogPathFor } from '@/seo/og-image';
import { clampDescription } from '@/seo/meta';
import { buildMetadata } from '@/seo/metadata';

export interface KitLayoutProps {
  lang: Lang;
  preset: ExamPreset;
}

function compute({ lang, preset: p }: KitLayoutProps) {
  const tr = (k: string, v?: Record<string, string | number>) => t(lang, k, v);
  const enPath = `/kit/${p.slug}`;
  const hasHi = hasHindiExam(p.slug);
  const path = lang === 'hi' ? `/hi${enPath}` : enPath;
  const examHref = lang === 'hi' && hasHi ? `/hi/exam/${p.slug}` : `/exam/${p.slug}`;
  const docs = getKitDocuments(p);
  const title = tr('site.kit.title', { exam: p.name[lang] });
  const description = clampDescription(
    tr('site.kit.description', { exam: p.name[lang], docs: docs.map((d) => d.label[lang]).join(', ') }),
  );
  return { tr, path, examHref, docs, title, description, alternates: { en: enPath, hi: hasHi ? `/hi${enPath}` : null } };
}

export function kitMetadata(props: KitLayoutProps): Metadata {
  const c = compute(props);
  return buildMetadata({
    title: c.title,
    description: c.description,
    lang: props.lang,
    canonicalPath: c.path,
    alternates: c.alternates,
    ogImage: ogPathFor(`/exam/${props.preset.slug}`),
    noindex: true,
  });
}

export default function KitLayout(props: KitLayoutProps) {
  const { lang, preset: p } = props;
  const { tr, path, examHref, docs, alternates } = compute(props);
  return (
    <MainLayout
      lang={lang}
      alternates={alternates}
      chrome="minimal"
      mainClass="container-fluid flex-1 py-4"
      jsonLd={[
        breadcrumbList([
          { name: tr('site.breadcrumb.home'), path: lang === 'hi' ? '/hi' : '/' },
          { name: p.name[lang], path: examHref },
          { name: lang === 'hi' ? 'किट' : 'Kit', path },
        ]),
      ]}
      top={
        <header className="sticky top-0 z-30 border-b border-border bg-surface">
          <div className="container-fluid flex items-center gap-2 py-1">
            <a
              href={examHref}
              className="inline-flex h-tap w-tap items-center justify-center rounded-card text-text hover:bg-bg"
              aria-label={tr('site.kit.back', { exam: p.name[lang] })}
              title={tr('site.kit.back', { exam: p.name[lang] })}
            >
              <Icon name="arrowLeft" />
            </a>
            <h1 className="min-w-0 flex-1 truncate text-lg font-bold">
              {p.name[lang]} {p.cycle}
            </h1>
            <span className="shrink-0 pr-2 text-sm text-muted">{plural(tr, 'site.kit.steps', docs.length)}</span>
          </div>
        </header>
      }
    >
      <noscript>
        <p className="card mb-4 p-4">{tr('site.kit.noscript')}</p>
      </noscript>
      <KitSlot lang={lang} preset={p} />
    </MainLayout>
  );
}
