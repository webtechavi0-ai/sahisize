import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { manifest } from '@/config/pwa';

const pub = (p: string) => fileURLToPath(new URL(`../../public${p}`, import.meta.url));

function pngSize(file: string): { w: number; h: number } {
  const b = readFileSync(file);
  expect(b.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

describe('web app manifest', () => {
  it('has the installability fields', () => {
    expect(manifest.name.length).toBeGreaterThan(0);
    expect(manifest.short_name.length).toBeLessThanOrEqual(12);
    expect(manifest.start_url).toBe('/');
    expect(manifest.display).toBe('standalone');
    expect(manifest.theme_color).toMatch(/^#[0-9A-F]{6}$/i);
    expect(manifest.background_color).toMatch(/^#[0-9A-F]{6}$/i);
  });

  it('icons exist with the declared sizes, incl. 192, 512 and maskable', () => {
    for (const icon of manifest.icons) {
      expect(existsSync(pub(icon.src)), icon.src).toBe(true);
      if (icon.type === 'image/png') {
        const [w, h] = icon.sizes.split('x').map(Number);
        expect(pngSize(pub(icon.src))).toEqual({ w, h });
      }
    }
    const sizes = manifest.icons.map((i) => `${i.sizes}:${i.purpose}`);
    expect(sizes).toEqual(
      expect.arrayContaining(['192x192:any', '512x512:any', '512x512:maskable']),
    );
    expect(pngSize(pub('/apple-touch-icon.png'))).toEqual({ w: 180, h: 180 });
    expect(existsSync(pub('/favicon.ico'))).toBe(true);
  });
});
