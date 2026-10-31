import { unzipSync, strFromU8 } from 'fflate';
import { describe, expect, it } from 'vitest';
import { buildReadme, buildZip, uniqueNames } from './zip';

describe('zip', () => {
  it('makes names safe and unique', () => {
    expect(uniqueNames(['sign.jpg', 'Sign.jpg', 'a/b.jpg', '', 'x'])).toEqual(['sign.jpg', 'Sign (2).jpg', 'a_b.jpg', 'file', 'x']);
  });

  it('places the listing at {{files}} with CRLF line endings', () => {
    const files = [
      { name: 'photo.jpg', bytes: new Uint8Array(2048) },
      { name: 'photo.jpg', bytes: new Uint8Array(10) },
    ];
    const zip = buildZip(files, 'SahiSize\n{{files}}\nBye');
    const out = unzipSync(zip);
    expect(Object.keys(out).sort()).toEqual(['README.txt', 'photo (2).jpg', 'photo.jpg']);
    const readme = strFromU8(out['README.txt']!);
    expect(readme).toContain('photo.jpg      2.0 KB (2048 bytes; 1 KB = 1024 bytes)');
    expect(readme).toContain('photo (2).jpg  0.0 KB (10 bytes');
    expect(readme.includes('\n') && !/[^\r]\n/.test(readme)).toBe(true);
    expect(readme.startsWith('SahiSize\r\n')).toBe(true);
  });

  it('appends the listing when there is no placeholder, and is reproducible', () => {
    const files = [{ name: 'a.pdf', bytes: new Uint8Array([1, 2, 3]) }];
    const a = buildZip(files, 'Hello   \n');
    const b = buildZip(files, 'Hello   \n');
    expect(Array.from(a)).toEqual(Array.from(b));
    const readme = strFromU8(unzipSync(a)['README.txt']!);
    expect(readme).toBe('Hello\r\n\r\nFiles:\r\n  a.pdf  0.0 KB (3 bytes; 1 KB = 1024 bytes)\r\n');
  });

  it('buildReadme lists files and the source', () => {
    const text = buildReadme({
      examName: 'SSC CGL',
      files: [{ name: 'photo.jpg', size: 30_000, required: '20–50 KB' }],
      sourceUrl: 'https://ssc.gov.in',
      sourceLabel: 'Notice',
      lastChecked: '2026-10-01',
    });
    expect(text.split('\r\n')).toEqual([
      'SahiSize - SSC CGL',
      '',
      'Files in this ZIP:',
      '  photo.jpg  29.3 KB (30000 bytes; 1 KB = 1024 bytes)  (required: 20–50 KB)',
      '',
      'Specs source: Notice - https://ssc.gov.in',
      'Specs last checked: 2026-10-01',
      '',
      'Made in your browser with SahiSize. Your photos were never uploaded.',
      '',
    ]);
  });
});
