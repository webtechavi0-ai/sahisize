/**
 * Title/description length check over every prerendered, indexable page (both languages),
 * read from the build output (`.next/server/app/**\/*.html`), i.e. exactly what each page's
 * metadata builder produced. Run `npm run build` first; without build output it is skipped.
 *
 * Report mode by default (never fails), so it can land before the copy fixes (keyword map,
 * owners B–F). SEO_LENGTHS_STRICT=1 makes it blocking and prints every off-rule page with
 * its title/description length (Vitest shows console output of failing tests).
 *   npx vitest run --config src/seo/vitest.config.mts src/seo/__tests__/lengths.test.ts
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parse } from 'node-html-parser';
import { describe, expect, it } from 'vitest';
import { metaLengthIssues, textLength, type MetaLengthIssue } from '@/seo/text';

const HTML_DIR = process.env.SEO_HTML_DIR ?? join(process.cwd(), '.next/server/app');
const STRICT = process.env.SEO_LENGTHS_STRICT === '1';

function htmlFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...htmlFiles(p));
    else if (name.endsWith('.html')) out.push(p);
  }
  return out;
}

interface Row {
  page: string;
  title: string;
  description: string;
  issues: MetaLengthIssue[];
}

function readPages(): Row[] {
  const rows: Row[] = [];
  for (const file of htmlFiles(HTML_DIR)) {
    const rel = relative(HTML_DIR, file);
    if (/(^|\/)_(not-found|global-error)/.test(rel)) continue;
    const doc = parse(readFileSync(file, 'utf8'));
    const robots = doc.querySelectorAll('meta[name="robots"]').map((m) => m.getAttribute('content') ?? '');
    if (robots.some((r) => r.includes('noindex'))) continue;
    const head = doc.querySelector('head');
    const title = head?.querySelector('title')?.text ?? '';
    const description = head?.querySelector('meta[name="description"]')?.getAttribute('content') ?? '';
    const canonical = head?.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? rel;
    rows.push({ page: canonical, title, description, issues: metaLengthIssues({ title, description }) });
  }
  return rows.sort((a, b) => a.page.localeCompare(b.page));
}

const hasBuild = existsSync(HTML_DIR);

describe.skipIf(!hasBuild)('meta lengths on every indexable page', () => {
  it('title <= 60, description 140–160', () => {
    const rows = readPages();
    expect(rows.length).toBeGreaterThan(0);
    const bad = rows.filter((r) => r.issues.length);
    console.info(`[seo lengths] checked ${rows.length} indexable pages in ${HTML_DIR}; ${bad.length} off-rule`);
    if (bad.length) {
      const lines = bad.map(
        (r) => `${r.issues.join(',')}\t${textLength(r.title)}/${textLength(r.description)}\t${r.page}`,
      );
      console.warn(`[seo lengths] ${bad.length} of ${rows.length} indexable pages off-rule (title/desc chars):\n${lines.join('\n')}`);
    }
    if (STRICT) expect(bad.map((r) => r.page)).toEqual([]);
  });
});
