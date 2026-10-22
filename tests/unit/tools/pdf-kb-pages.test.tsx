/**
 * PDF size pages pass the right maximum to the tool:
 *  1. each route file hands its own n to the island as `initialKB` (EN dynamic routes over
 *     the configured targets, Hindi pages with the n in their file name);
 *  2. the islands start from `initialKB` and send exactly that maximum to the engine.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { render, type ComponentChild } from 'preact';
import { act } from 'preact/test-utils';
import { configureAnalytics, type FlatProps } from '@/lib/analytics';
import { TINY_JPEG, resetMock } from '@/engine/mock';
import { toolDict } from '@/components/tools/dict';
import ToolCompressPdf from '@/islands/tools/ToolCompressPdf';
import ToolImagesToPdf from '@/islands/tools/ToolImagesToPdf';
import { JPG_PDF_KB_TARGETS, PDF_KB_TARGETS } from '@/config/tools';
import { PDF_KB_HINDI } from '@/components/tools/copy/pdf-kb';

vi.mock('@/engine/api', () => import('@/engine/mock'));

const ROOT = process.cwd();
const src = (p: string) => readFileSync(join(ROOT, p), 'utf8');

describe('PDF size routes pass their n as the tool maximum', () => {
  it.each([
    ['src/pages/tools/compress-pdf-to-[n]kb.astro', 'PDF_KB_TARGETS', 'ToolCompressPdf', 'compressPdfKbCopy'],
    ['src/pages/tools/jpg-to-pdf-under-[n]kb.astro', 'JPG_PDF_KB_TARGETS', 'ToolImagesToPdf', 'jpgToPdfKbCopy'],
  ])('%s', (file, targets, island, copy) => {
    const s = src(file);
    expect(s).toContain(`return ${targets}.map((n) => ({ params: { n: String(n) }, props: { n } }))`);
    expect(s).toMatch(new RegExp(`<${island} client:visible lang=\\{lang\\} dict=\\{toolDict\\(lang\\)\\} initialKB=\\{n\\} />`));
    expect(s).toContain(`${copy}(n, lang)`);
  });

  it('every Hindi PDF page uses the n from its own file name', () => {
    const dir = join(ROOT, 'src/pages/hi/tools');
    const files = readdirSync(dir).filter((f) => /^(compress-pdf-to|jpg-to-pdf-under)-\d+kb\.astro$/.test(f));
    expect(files.sort()).toEqual(
      [
        ...PDF_KB_HINDI.compress.map((n) => `compress-pdf-to-${n}kb.astro`),
        ...PDF_KB_HINDI.jpg.map((n) => `jpg-to-pdf-under-${n}kb.astro`),
      ].sort(),
    );
    for (const f of files) {
      const n = Number(/-(\d+)kb\.astro$/.exec(f)![1]);
      const s = readFileSync(join(dir, f), 'utf8');
      const isJpg = f.startsWith('jpg');
      expect(isJpg ? JPG_PDF_KB_TARGETS : PDF_KB_TARGETS).toContain(n);
      expect(s, f).toMatch(new RegExp(`const n = ${n};`));
      expect(s, f).toContain("const lang = 'hi';");
      expect(s, f).toContain(`<${isJpg ? 'ToolImagesToPdf' : 'ToolCompressPdf'} client:visible lang={lang} dict={toolDict(lang)} initialKB={n} />`);
      expect(s, f).toContain(isJpg ? 'path={jpgToPdfUnderKbPath(n)}' : 'path={compressPdfToKbPath(n)}');
    }
  });
});

// ---------------------------------------------------------------------------
// Islands against the mock engine
// ---------------------------------------------------------------------------

const dict = toolDict('en');
let root: HTMLDivElement;
let events: { e: string; p: FlatProps }[];

beforeEach(() => {
  resetMock();
  events = [];
  configureAnalytics((e, p) => events.push({ e, p }));
  URL.createObjectURL = vi.fn(() => `blob:mock/${Math.random()}`);
  URL.revokeObjectURL = vi.fn();
  root = document.createElement('div');
  document.body.appendChild(root);
});

afterEach(() => {
  act(() => render(null, root));
  configureAnalytics(null);
  document.body.innerHTML = '';
});

const tick = () => act(async () => void (await new Promise((r) => setTimeout(r, 10))));
const has = (s: string) => root.textContent?.includes(s) ?? false;

async function waitFor(fn: () => boolean, what: string, ms = 4000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (fn()) return;
    await tick();
  }
  throw new Error(`timed out waiting for ${what}; text=${root.textContent?.slice(0, 400)}`);
}

function button(text: string): HTMLButtonElement {
  const b = [...root.querySelectorAll('button')].find((x) => x.textContent?.includes(text));
  if (!b) throw new Error(`no button ${text}`);
  return b as HTMLButtonElement;
}

function checkedChip(): string | null {
  // The KB picker's radios (numbers or "custom"), not the A4 / original page choice.
  const r = [...root.querySelectorAll('input[type="radio"]')].find(
    (x) => (x as HTMLInputElement).checked && /^(\d+|custom)$/.test((x as HTMLInputElement).value),
  );
  return r ? (r as HTMLInputElement).value : null;
}

async function mount(node: ComponentChild) {
  await act(async () => render(node, root));
}

async function pick(files: File[]) {
  const input = root.querySelector('[data-testid="gallery-input"]') as HTMLInputElement;
  Object.defineProperty(input, 'files', { value: files, configurable: true });
  await act(async () => {
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

describe('islands start from initialKB and send it to the engine', () => {
  it.each(PDF_KB_TARGETS)('compress PDF to %i KB', async (n) => {
    await mount(<ToolCompressPdf lang="en" dict={dict} initialKB={n} />);
    expect(checkedChip()).toBe(String(n));
    // Just over n KB (n×1000 bytes): the engine compresses only if it got n as the maximum.
    await pick([new File([new Uint8Array(n * 1000 + 500)], 'scan.pdf', { type: 'application/pdf' })]);
    await act(async () => button(`Compress to ${n} KB`).click());
    await waitFor(() => has('Ready:'), 'result');
    expect(has('already')).toBe(false);
    expect(events.find((x) => x.e === 'tool_used')?.p).toEqual({ tool: 'compress-pdf', target: String(n) });
  });

  it('compress PDF: a file under n KB is "already small" (n reached the engine)', async () => {
    await mount(<ToolCompressPdf lang="en" dict={dict} initialKB={500} />);
    await pick([new File([new Uint8Array(400_000)], 'scan.pdf', { type: 'application/pdf' })]);
    await act(async () => button('Compress to 500 KB').click());
    await waitFor(() => has('already'), 'already small');
  });

  it.each(JPG_PDF_KB_TARGETS)('JPG to PDF under %i KB', async (n) => {
    await mount(<ToolImagesToPdf lang="en" dict={dict} initialKB={n} />);
    expect(checkedChip()).toBe(String(n));
    await pick([new File([TINY_JPEG], 'a.jpg', { type: 'image/jpeg' })]);
    await act(async () => button('Make PDF').click());
    await waitFor(() => has('Ready:'), 'pdf');
    expect(events.find((x) => x.e === 'tool_used')?.p).toEqual({ tool: 'images-to-pdf', target: String(n) });
  });

  it('without initialKB both tools keep the 300 KB default', async () => {
    await mount(<ToolCompressPdf lang="en" dict={dict} />);
    expect(checkedChip()).toBe('300');
    await act(async () => render(null, root));
    await mount(<ToolImagesToPdf lang="en" dict={dict} />);
    expect(checkedChip()).toBe('300');
  });
});
