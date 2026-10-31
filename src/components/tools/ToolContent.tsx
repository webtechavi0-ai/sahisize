/**
 * SEO prose below a tool (SPEC 6.5, 9.4): spec explanation sections. Steps and FAQ are
 * rendered by the Tool layout from the same copy object.
 *
 * On tool pages (default) each section is a native <details> under "About this size":
 * the text stays in the HTML for search engines and anyone who opens it, but the page
 * below the tool reads as a short list instead of a long article. `collapsible={false}`
 * renders plain sections (hub pages where the prose is the page).
 */
import type { ToolSection } from './copy/types';
import { t } from '@/i18n';
import type { Lang } from '@/config/site';

interface Props {
  sections: ToolSection[];
  collapsible?: boolean;
  /** Page language (was derived from the URL under Astro). */
  lang?: Lang;
}

function Extras({ s }: { s: ToolSection }) {
  return (
    <>
      {s.list && (
        <ul className="mt-3 list-disc space-y-1 pl-6">
          {s.list.map((li, i) => (
            <li key={i}>{li}</li>
          ))}
        </ul>
      )}
      {s.links && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {s.links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="inline-flex min-h-tap items-center rounded-card border border-border bg-surface px-4 no-underline hover:border-primary"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default function ToolContent({ sections, collapsible = true, lang = 'en' }: Props) {
  if (collapsible && sections.length > 0) {
    return (
      <section aria-labelledby="about-h" className="mt-12 border-t border-rule pt-8" data-tool-about>
        <h2 id="about-h" className="text-xl font-bold">
          {t(lang, 'tool.flow.about')}
        </h2>
        <div className="mt-3 divide-y divide-border rounded-card border border-border bg-surface">
          {sections.map((s, i) => (
            <details key={i} className="group px-4">
              <summary className="flex min-h-tap cursor-pointer list-none items-center justify-between gap-3 py-3 [&::-webkit-details-marker]:hidden">
                <h3 id={`tc-${i}`} className="text-base font-semibold">
                  {s.h2}
                </h3>
                <span aria-hidden="true" className="text-muted transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <div className="pb-4">
                {s.paras.map((p, j) => (
                  <p key={j} className="mt-2">
                    {p}
                  </p>
                ))}
                <Extras s={s} />
              </div>
            </details>
          ))}
        </div>
      </section>
    );
  }
  return (
    <>
      {sections.map((s, i) => (
        <section key={i} aria-labelledby={`tc-${i}`} className="mt-10">
          <h2 id={`tc-${i}`} className="text-xl font-bold">
            {s.h2}
          </h2>
          {s.paras.map((p, j) => (
            <p key={j} className="mt-3">
              {p}
            </p>
          ))}
          <Extras s={s} />
        </section>
      ))}
    </>
  );
}
