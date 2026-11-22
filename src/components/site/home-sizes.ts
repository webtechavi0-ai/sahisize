/**
 * Home "Most searched sizes" block (SEO plan E1, keyword map §2). Pure: the rows say which
 * preset document or tool to link; every number shown comes from the preset (via the
 * resolver the caller passes in), never from this file.
 *
 * Anchor text is the target page's primary keyword (`site.home.sizes.<id>`), so the home
 * page links down to the organic winners without competing with them.
 */

export type MostSearchedSource =
  | {
      kind: 'doc';
      /** i18n id: `site.home.sizes.<id>`. */
      id: string;
      exam: string;
      /** Document URL slug (`docSlug()`): `/exam/<exam>/<doc>`. */
      doc: string;
    }
  | {
      kind: 'pdfTool';
      id: string;
      /** Target in KB: `/tools/compress-pdf-to-<kb>kb`. */
      kb: number;
    };

/** GA winners first (17 Oct–13 Nov 2026), then the highest-volume size query. */
export const MOST_SEARCHED: readonly MostSearchedSource[] = [
  { kind: 'doc', id: 'jeeMainClass10', exam: 'jee-main', doc: 'class10' },
  { kind: 'doc', id: 'csirNetResultAwaited', exam: 'csir-net', doc: 'result-awaited' },
  { kind: 'doc', id: 'rrbNtpcCertificate', exam: 'rrb-ntpc', doc: 'certificate' },
  { kind: 'doc', id: 'sscCglSignature', exam: 'ssc-cgl', doc: 'signature' },
  { kind: 'pdfTool', id: 'pdfCompressor', kb: 400 },
];

export interface MostSearchedRow {
  id: string;
  href: string;
  /** Anchor text (the target's primary keyword). */
  label: string;
  /** Size line from the preset ("50–300 KB · PDF"), or the tool's target. */
  spec: string;
}

export interface MostSearchedResolver {
  /** Published, verified document of a published exam, or null (row is then dropped). */
  doc(exam: string, doc: string): { href: string; spec: string } | null;
  /** Tool page for a PDF KB target, or null when that tool does not exist. */
  pdfTool(kb: number): { href: string; spec: string } | null;
  /** Anchor text for a row (`site.home.sizes.<id>`; a PDF tool row also gets its KB). */
  label(source: MostSearchedSource): string;
}

/** Rows whose target exists, in source order. Duplicate hrefs are dropped. */
export function buildMostSearched(
  sources: readonly MostSearchedSource[],
  r: MostSearchedResolver,
): MostSearchedRow[] {
  const seen = new Set<string>();
  const rows: MostSearchedRow[] = [];
  for (const s of sources) {
    const target = s.kind === 'doc' ? r.doc(s.exam, s.doc) : r.pdfTool(s.kb);
    if (!target || seen.has(target.href)) continue;
    const label = r.label(s).trim();
    if (!label) continue;
    seen.add(target.href);
    rows.push({ id: s.id, href: target.href, label, spec: target.spec });
  }
  return rows;
}
