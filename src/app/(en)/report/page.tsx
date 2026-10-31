/**
 * /report (SPEC 4, K15): builds a mailto: link from the form, prefilled from
 * ?exam=&doc= (FeedbackPrompt sends users here). No attachments, nothing is sent
 * by the page itself. noindex.
 */
import MainLayout from '@/components/layout/MainLayout';
import { t } from '@/i18n';
import { CONTACT_EMAIL, SITE_NAME } from '@/config/site';
import { getPublishedPresets, docSlug } from '@/content/presets';
import { buildMetadata } from '@/seo/metadata';
import ReportClient from './ReportClient';

const lang = 'en' as const;
const tr = (k: string, v?: Record<string, string | number>) => t(lang, k, v);

export const metadata = buildMetadata({
  title: tr('site.report.title'),
  description: tr('site.report.description'),
  canonicalPath: '/report',
  noindex: true,
});

const docTypes = ['photo', 'signature', 'thumb', 'declaration', 'certificate', 'other'] as const;
const field = 'mt-1 block w-full rounded-card border border-border-strong bg-surface px-3 text-text';

export default function Page() {
  const exams = getPublishedPresets()
    .slice()
    .sort((a, b) => a.name.en.localeCompare(b.name.en));
  // Per-exam document keys (for exams with e.g. signature-hindi) are added as extra options.
  const extraDocs = [...new Set(exams.flatMap((p) => p.documents.map((d) => docSlug(d))))].filter(
    (k) => !(docTypes as readonly string[]).includes(k),
  );
  return (
    <MainLayout>
      <h1 className="text-3xl font-bold">{tr('site.report.h1')}</h1>
      <p className="mt-2 max-w-2xl text-muted">{tr('site.report.intro')}</p>
      <form id="report-form" className="mt-6 max-w-xl space-y-5" data-email={CONTACT_EMAIL} data-site={SITE_NAME} noValidate>
        <div>
          <label htmlFor="r-exam" className="font-semibold">{tr('site.report.exam')}</label>
          <select id="r-exam" name="exam" className={`${field} h-tap`}>
            <option value="">{tr('site.report.examNone')}</option>
            {exams.map((p) => <option key={p.slug} value={p.slug}>{p.name.en} {p.cycle}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="r-doc" className="font-semibold">{tr('site.report.doc')}</label>
          <select id="r-doc" name="doc" className={`${field} h-tap`}>
            <option value="">{tr('site.report.docNone')}</option>
            {docTypes.map((d) => <option key={d} value={d}>{t(lang, `common.docTypes.${d}`)}</option>)}
            {extraDocs.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <fieldset>
          <legend className="font-semibold">{tr('site.report.what')}</legend>
          <div className="mt-1 space-y-1">
            {(['rejected', 'wrong', 'other'] as const).map((v, i) => (
              <label key={v} className="flex min-h-tap items-center gap-3">
                <input type="radio" name="what" value={v} defaultChecked={i === 0} className="h-5 w-5" />
                {tr(`site.report.what${v[0]!.toUpperCase()}${v.slice(1)}`)}
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <label htmlFor="r-error" className="font-semibold">{tr('site.report.errorMsg')}</label>
          <input id="r-error" name="error" type="text" maxLength={300} className={`${field} h-tap`} />
        </div>
        <div>
          <label htmlFor="r-details" className="font-semibold">{tr('site.report.details')}</label>
          <textarea id="r-details" name="details" rows={4} maxLength={1500} className={`${field} py-2`}></textarea>
        </div>
        <p className="text-sm text-muted">{tr('site.report.privacy')}</p>
        <button type="submit" className="btn-action w-full sm:w-auto">{tr('site.report.submit')}</button>
        <p className="text-sm text-muted">
          {tr('site.report.fallback', { email: CONTACT_EMAIL })}
        </p>
      </form>
      <ReportClient />
    </MainLayout>
  );
}
