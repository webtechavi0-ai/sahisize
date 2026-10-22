/**
 * pdfjs 6 dropped its Promise.withResolvers and ArrayBuffer#transferToFixedLength polyfills.
 * Simulate an older browser (both missing), load ours, and check pdfjs still parses PDFs.
 * In Node pdfjs runs its worker code on the same thread, so this covers both sides.
 */
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const fixture = (n: string) =>
  new Uint8Array(readFileSync(new URL(`../fixtures/e2e/${n}`, import.meta.url)));

const P = Promise as unknown as Record<string, unknown>;
const AB = ArrayBuffer.prototype as unknown as Record<string, unknown>;
const saved = { withResolvers: P.withResolvers, transfer: AB.transferToFixedLength };

describe('pdf polyfills (pdfjs 6 on older browsers)', () => {
  beforeAll(async () => {
    delete P.withResolvers;
    delete AB.transferToFixedLength;
    await import('@/engine/pdf-polyfills');
  });
  afterAll(() => {
    P.withResolvers = saved.withResolvers;
    AB.transferToFixedLength = saved.transfer;
  });

  it('installs Promise.withResolvers and ArrayBuffer#transferToFixedLength', async () => {
    expect(P.withResolvers).not.toBe(saved.withResolvers);
    const { promise, resolve } = Promise.withResolvers<number>();
    resolve(7);
    await expect(promise).resolves.toBe(7);

    const src = new Uint8Array([1, 2, 3, 4]).buffer;
    const out = new Uint8Array(src.transferToFixedLength(2));
    expect([...out]).toEqual([1, 2]);
    expect(new Uint8Array(src.transferToFixedLength(6)).length).toBe(6);
  });

  it('pdfjs parses a text PDF (system fonts) and a scanned PDF with them', async () => {
    const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
    for (const name of ['text-only.pdf', 'scan.pdf']) {
      const task = getDocument({ data: fixture(name), useSystemFonts: true });
      const doc = await task.promise;
      const page = await doc.getPage(1);
      const ops = await page.getOperatorList();
      expect(ops.fnArray.length).toBeGreaterThan(0);
      await task.destroy();
    }
  });
});
