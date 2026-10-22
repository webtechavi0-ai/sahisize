/** Sitemap <lastmod>: real content dates per URL, never one build date on everything. */
import { describe, expect, it } from 'vitest';
import { getKitDocuments, getPublishedPresets } from '@/content/presets';
import {
  documentUrls,
  examUrls,
  gitLastCommitDate,
  guideLastmod,
  guideUrls,
  pagesUrls,
  renderUrlset,
  toolUrls,
} from '@/seo/sitemap';

const today = new Date().toISOString().slice(0, 10);

describe('sitemap lastmod', () => {
  it('exam pages use the preset lastChecked', () => {
    const bySlug = new Map(getPublishedPresets().map((p) => [p.slug, p.lastChecked]));
    const urls = examUrls().filter((u) => /\/exam\/[a-z0-9-]+$/.test(u.path));
    expect(urls.length).toBeGreaterThan(0);
    for (const u of urls) {
      const slug = /\/exam\/([a-z0-9-]+)$/.exec(u.path)![1]!;
      expect(u.lastmod, u.path).toBe(bySlug.get(slug));
    }
  });

  it('exam-family hubs are dated by their newest member check', () => {
    const hubs = examUrls().filter((u) => u.path.startsWith('/exams/'));
    expect(hubs.length).toBeGreaterThan(0);
    for (const u of hubs) expect(u.lastmod, u.path).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('exam document pages use their preset lastChecked', () => {
    const presets = getPublishedPresets();
    const urls = documentUrls();
    expect(urls.length).toBe(presets.reduce((n, p) => n + getKitDocuments(p).length, 0));
    for (const u of urls) {
      const slug = /^\/exam\/([a-z0-9-]+)\//.exec(u.path)![1]!;
      expect(u.lastmod, u.path).toBe(presets.find((p) => p.slug === slug)!.lastChecked);
    }
  });

  it('other pages and tools omit lastmod rather than fake it', () => {
    for (const u of [...pagesUrls(), ...toolUrls()]) expect(u.lastmod, u.path).toBeUndefined();
    const xml = renderUrlset(pagesUrls());
    expect(xml).not.toContain('<lastmod>');
    expect(xml).not.toContain(today);
  });

  it('lists the editorial policy in both languages', () => {
    const paths = pagesUrls().map((u) => u.path);
    expect(paths).toContain('/editorial-policy');
    expect(paths).toContain('/hi/editorial-policy');
  });

  it('guides: updatedAt, else the later of the git date and publishedAt', () => {
    const publishedAt = new Date('2026-10-01');
    const git = (d: string | null) => () => d;
    expect(guideLastmod({ publishedAt, updatedAt: new Date('2026-10-05'), filePath: 'x' }, git('2026-10-09'))).toBe(
      '2026-10-05',
    );
    expect(guideLastmod({ publishedAt, filePath: 'x' }, git('2026-10-09'))).toBe('2026-10-09');
    expect(guideLastmod({ publishedAt, filePath: 'x' }, git('2026-09-01'))).toBe('2026-10-01');
    expect(guideLastmod({ publishedAt, filePath: 'x' }, git(null))).toBe('2026-10-01');
    expect(guideLastmod({ publishedAt }, git('2026-10-09'))).toBe('2026-10-01');
  });

  it('guide URLs carry per-file dates and hreflang only for pairs', () => {
    const dates: Record<string, string> = { 'en/a.mdx': '2026-10-03', 'hi/a.mdx': '2026-10-07' };
    const urls = guideUrls(
      [
        { slug: 'a', lang: 'en', publishedAt: new Date('2026-10-01'), filePath: 'en/a.mdx' },
        { slug: 'a', lang: 'hi', publishedAt: new Date('2026-10-01'), filePath: 'hi/a.mdx' },
        { slug: 'b', lang: 'hi', publishedAt: new Date('2026-10-02') },
      ],
      (f) => dates[f] ?? null,
    );
    expect(urls).toEqual([
      { path: '/guides/a', alternates: { en: '/guides/a', hi: '/hi/guides/a' }, lastmod: '2026-10-03' },
      { path: '/hi/guides/a', alternates: { en: '/guides/a', hi: '/hi/guides/a' }, lastmod: '2026-10-07' },
      { path: '/hi/guides/b', alternates: undefined, lastmod: '2026-10-02' },
    ]);
  });

  it('git date is a YYYY-MM-DD day or null (never throws)', () => {
    const d = gitLastCommitDate('src/seo/sitemap.ts');
    expect(d === null || /^\d{4}-\d{2}-\d{2}$/.test(d)).toBe(true);
    expect(gitLastCommitDate('does/not/exist.mdx')).toBeNull();
  });
});
