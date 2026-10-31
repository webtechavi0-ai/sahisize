/**
 * Spec table (SPEC 6.3 #3): document, size in px/cm, KB range, format, DPI, rules.
 * Documents with maxKB null (Q15) show "Size to verify". Scrolls horizontally on
 * narrow screens; each row also links to its document page.
 */
import { t } from '@/i18n';
import type { Lang } from '@/config/site';
import type { ExamPreset } from '@/content/presets/schema';
import { docSlug, isFittable } from '@/content/presets';
import { kbText, physicalText, pxText } from '@/seo/spec-text';

interface Props {
  lang: Lang;
  preset: ExamPreset;
  /** Base path for document links, e.g. "/exam/ibps-po". Omit to not link. */
  docBase?: string;
  /** Only these documents (by docSlug). */
  only?: string[];
}

export default function SpecTable({ lang, preset: p, docBase, only }: Props) {
  const tr = (k: string, v?: Record<string, string | number>) => t(lang, k, v);
  const docs = p.documents.filter((d) => !only || only.includes(docSlug(d)));
  // One document (document pages): the card alone, at every width, so the rules are not repeated.
  const single = docs.length === 1;
  const anyKB = (d: (typeof docs)[number]) => pxText(d, lang) === null && physicalText(d) === null;

  return (
    <>
      <ul className={`space-y-3${single ? '' : ' sm:hidden'}`}>
        {docs.map((d) => {
          const fittable = isFittable(d);
          const px = pxText(d, lang);
          const phys = physicalText(d);
          const href = docBase && fittable ? `${docBase}/${docSlug(d)}` : null;
          return (
            <li key={docSlug(d)} className="card p-4">
              <p className="flex items-baseline justify-between gap-2">
                <span className="font-bold">{href ? <a href={href}>{d.label[lang]}</a> : d.label[lang]}</span>
                <span className="shrink-0 font-semibold">
                  {fittable ? kbText(d, lang) : <span className="text-error-text">{tr('site.exam.toVerify')}</span>}
                </span>
              </p>
              <p className="mt-1 text-sm text-muted">
                {[px, phys && `${phys}${d.pxDerived ? ` (${tr('site.exam.derived')})` : ''}`, d.format.toUpperCase(), d.dpi ? `${d.dpi} DPI` : null]
                  .filter(Boolean)
                  .join(' · ')}
                {d.optional && ` · ${tr('site.exam.optional')}${d.appliesTo ? `: ${d.appliesTo[lang]}` : ''}`}
                {d.disputed && <span className="text-error-text"> · {tr('site.exam.disputed')}</span>}
              </p>
              <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm">
                {d.rules.map((r, i) => (
                  <li key={i}>{r[lang]}</li>
                ))}
                {d.variant === 'dual-language' && <li>{tr('site.exam.variantDual')}</li>}
                {d.variant === 'triple' && <li>{tr('site.exam.variantTriple')}</li>}
                {d.needsNameDateStrip && <li>{tr('site.exam.nameDateStrip')}</li>}
              </ul>
              {d.sizeNote && (
                <p className="mt-1 text-xs text-muted">
                  {tr('site.exam.noteLabel')}: {d.sizeNote[lang]}
                </p>
              )}
              {!fittable && <p className="mt-1 text-xs text-muted">{tr('site.exam.toVerifyNote')}</p>}
            </li>
          );
        })}
      </ul>
      {!single && (
        <div className="hidden overflow-x-auto rounded-card border border-border bg-surface sm:block">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <caption className="sr-only">{tr('site.exam.specCaption', { exam: p.name[lang], cycle: p.cycle })}</caption>
            <thead className="bg-bg text-muted">
              <tr>
                <th scope="col" className="px-3 py-2 font-semibold">{tr('site.exam.colDocument')}</th>
                <th scope="col" className="px-3 py-2 font-semibold">{tr('site.exam.colSize')}</th>
                <th scope="col" className="px-3 py-2 font-semibold">{tr('site.exam.colKb')}</th>
                <th scope="col" className="px-3 py-2 font-semibold">{tr('site.exam.colFormat')}</th>
                <th scope="col" className="px-3 py-2 font-semibold">{tr('site.exam.colDpi')}</th>
                <th scope="col" className="px-3 py-2 font-semibold">{tr('site.exam.colRules')}</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => {
                const fittable = isFittable(d);
                const px = pxText(d, lang);
                const phys = physicalText(d);
                const kb = kbText(d, lang);
                const href = docBase && fittable ? `${docBase}/${docSlug(d)}` : null;
                return (
                  <tr key={docSlug(d)} className="border-t border-border align-top">
                    <th scope="row" className="px-3 py-3 font-semibold text-text">
                      {href ? <a href={href}>{d.label[lang]}</a> : d.label[lang]}
                      {d.optional && (
                        <span className="mt-1 block text-xs font-normal text-muted">
                          {tr('site.exam.optional')}
                          {d.appliesTo ? `: ${d.appliesTo[lang]}` : ''}
                        </span>
                      )}
                      {d.disputed && (
                        <span className="mt-1 block text-xs font-normal text-error-text">{tr('site.exam.disputed')}</span>
                      )}
                    </th>
                    <td className="whitespace-nowrap px-3 py-3">
                      {px && <span className="block">{px}</span>}
                      {phys && (
                        <span className="block text-muted">
                          {phys}
                          {d.pxDerived ? ` (${tr('site.exam.derived')})` : ''}
                        </span>
                      )}
                      {!px && !phys && d.format !== 'pdf' && (anyKB(d) ? <span className="text-muted">{tr('site.exam.any')}</span> : null)}
                      {!px && !phys && d.format === 'pdf' && <span className="text-muted">—</span>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 font-semibold">
                      {fittable ? kb : <span className="text-error-text">{tr('site.exam.toVerify')}</span>}
                    </td>
                    <td className="px-3 py-3">{d.format.toUpperCase()}</td>
                    <td className="px-3 py-3">{d.dpi ?? '—'}</td>
                    <td className="px-3 py-3">
                      <ul className="list-disc space-y-0.5 pl-4">
                        {d.rules.map((r, i) => (
                          <li key={i}>{r[lang]}</li>
                        ))}
                        {d.variant === 'dual-language' && <li>{tr('site.exam.variantDual')}</li>}
                        {d.variant === 'triple' && <li>{tr('site.exam.variantTriple')}</li>}
                        {d.needsNameDateStrip && <li>{tr('site.exam.nameDateStrip')}</li>}
                      </ul>
                      {d.sizeNote && (
                        <p className="mt-1 text-xs text-muted">
                          {tr('site.exam.noteLabel')}: {d.sizeNote[lang]}
                        </p>
                      )}
                      {!fittable && <p className="mt-1 text-xs text-muted">{tr('site.exam.toVerifyNote')}</p>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
