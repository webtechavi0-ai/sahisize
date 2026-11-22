import { describe, expect, it } from 'vitest';
import { renderIndex } from '@/seo/sitemap';
import { parseGitDays } from '@/server/content/sitemap';

describe('parseGitDays', () => {
  it('keeps the newest commit day per file', () => {
    const log = ['@2026-11-03', '', 'src/a.json', 'src/b.json', '@2026-10-01', '', 'src/a.json', 'src/c.json'].join('\n');
    const days = parseGitDays(log);
    expect(days.get('src/a.json')).toBe('2026-11-03');
    expect(days.get('src/b.json')).toBe('2026-11-03');
    expect(days.get('src/c.json')).toBe('2026-10-01');
  });
});

describe('renderIndex', () => {
  it('writes lastmod for sitemaps that have one', () => {
    const xml = renderIndex(['tools', 'pages'], { tools: '2026-11-03' });
    expect(xml).toMatch(/sitemap-tools\.xml<\/loc>\s*<lastmod>2026-11-03<\/lastmod>/);
    expect(xml).not.toMatch(/sitemap-pages\.xml<\/loc>\s*<lastmod>/);
  });
});
