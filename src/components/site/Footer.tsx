/**
 * Footer (SPEC 6.1, 11.2): tools, top exams, guides, legal links,
 * "Not affiliated with any government body." and the operating entity.
 */
import { ENTITY_NAME } from '@/config/site';
import { TOOL_SLUGS, TOOL_META } from '@/config/tools';
import { toolNameKey } from './util';
import { type Lang } from '@/i18n/config';
import { listGuides, seasonOrder, localHref } from '@/server/content';
import { t } from '@/i18n/server';
import { pickPopular } from '@/lib/presets';

interface Props {
  lang: Lang;
}

const legal = [
  ['/about', 'site.footer.about'],
  ['/privacy', 'site.footer.privacy'],
  ['/terms', 'site.footer.terms'],
  ['/disclaimer', 'site.footer.disclaimer'],
  ['/contact', 'site.footer.contact'],
  ['/sources', 'site.footer.sources'],
  ['/editorial-policy', 'site.footer.editorialPolicy'],
  ['/report', 'site.footer.report'],
] as const;
const linkCls = 'inline-flex min-h-[48px] items-center text-text no-underline hover:text-primary hover:underline';

export default function Footer({ lang }: Props) {
  const tr = (k: string, v?: Record<string, string | number>) => t(lang, k, v);
  const href = (enPath: string) => localHref(enPath, lang);
  const topExams = pickPopular(seasonOrder(), { year: new Date().getFullYear(), limit: 8 });
  const footerTools = TOOL_SLUGS.filter((s) => s !== 'custom-preset' && s !== 'batch-compress').slice(0, 8);
  const guides = listGuides(lang)
    .filter((g) => !g.draft)
    .sort((a, b) => a.order - b.order)
    .slice(0, 5);

  return (
    <footer className="mt-12 border-t border-border bg-surface">
      <div className="container-fluid grid gap-8 py-8 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <section aria-labelledby="ft-tools">
          <h2 id="ft-tools" className="mb-2 font-semibold text-text">{tr('site.footer.tools')}</h2>
          <ul>
            {footerTools.map((slug) => (
              <li key={slug}><a className={linkCls} href={href(TOOL_META[slug].path)}>{tr(toolNameKey(slug))}</a></li>
            ))}
            <li><a className={linkCls} href={href('/id-documents')}>{tr('site.footer.idDocuments')}</a></li>
            <li><a className={`${linkCls} font-semibold`} href={href('/tools')}>{tr('ui.search.allTools')}</a></li>
          </ul>
        </section>
        <section aria-labelledby="ft-exams">
          <h2 id="ft-exams" className="mb-2 font-semibold text-text">{tr('site.footer.topExams')}</h2>
          <ul>
            {topExams.map((p) => (
              <li key={p.slug}><a className={linkCls} href={href(`/exam/${p.slug}`)}>{p.name[lang]}</a></li>
            ))}
            <li><a className={`${linkCls} font-semibold`} href={href('/exams')}>{tr('site.footer.allExams')}</a></li>
          </ul>
        </section>
        <section aria-labelledby="ft-guides">
          <h2 id="ft-guides" className="mb-2 font-semibold text-text">{tr('site.footer.guides')}</h2>
          <ul>
            {guides.map((g) => (
              <li key={g.slug}><a className={linkCls} href={href(`/guides/${g.slug}`)}>{g.title}</a></li>
            ))}
            <li><a className={`${linkCls} font-semibold`} href={href('/guides')}>{tr('site.footer.allGuides')}</a></li>
          </ul>
        </section>
        <section aria-labelledby="ft-legal">
          <h2 id="ft-legal" className="mb-2 font-semibold text-text">{tr('site.footer.legal')}</h2>
          <ul>
            {legal.map(([path, key]) => {
              const to = href(path);
              return (
                <li key={path}><a className={linkCls} href={to} hrefLang={lang === 'hi' && !to.startsWith('/hi') ? 'en-IN' : undefined}>{tr(key)}</a></li>
              );
            })}
          </ul>
        </section>
      </div>
      <div className="border-t border-border">
        <div className="container-fluid space-y-1 py-4 text-sm text-muted">
          <p>{tr('site.footer.notAffiliated')}</p>
          <p>
            {tr('site.footer.copyright', { year: new Date().getFullYear(), entity: ENTITY_NAME })} ·{' '}
            {tr('site.footer.operatedBy', { entity: ENTITY_NAME })}
          </p>
        </div>
      </div>
    </footer>
  );
}
