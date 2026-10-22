/**
 * Govt ID Documents section (/id-documents). Owner rules:
 *  1/2 official specs only, with an https source on an official domain and the checked date
 *  4   the disclaimer text
 *  5   no input that accepts a PAN or Aadhaar number (or a name)
 *  6   no persistence: nothing reachable from the section's islands writes IndexedDB or
 *      localStorage, and a full run leaves both untouched
 *  SEO titles ≤ 60, descriptions 120–155, 400–700 words, copy unique (Jaccard ≤ 0.45)
 * Rendered pages are checked in tests/e2e/id-documents.spec.ts.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { render, type ComponentChild } from 'preact';
import { act } from 'preact/test-utils';
import { configureAnalytics } from '@/lib/analytics';
import { TINY_JPEG, resetMock } from '@/engine/mock';
import { toolDict } from '@/components/tools/dict';
import IdPhotoTool from '@/islands/id-documents/IdPhotoTool';
import IdSignatureTool from '@/islands/id-documents/IdSignatureTool';
import {
  ID_CHECKED_LABEL,
  ID_CHECKED_ON,
  ID_DISCLAIMER,
  ID_NOT_COVERED,
  ID_PAGES,
  ID_PRIVACY,
  OFFICIAL_DOMAINS,
  PAN_PHOTO_SPEC,
  PAN_SIGNATURE_SPEC,
  cmToPx,
} from '@/config/id-documents';
import { hubCopy, panPhotoCopy, panSignatureCopy } from '@/components/id-documents/copy';
import { wordCount, type ToolCopy } from '@/components/tools/copy/types';
import { resizeCopy } from '@/components/tools/copy/resize-convert';
import { signatureCopy } from '@/components/tools/copy/ink';
import { compressKbCopy } from '@/components/tools/copy/compress';

vi.mock('@/engine/api', () => import('@/engine/mock'));

// happy-dom: import.meta.url is not a file URL; vitest runs from the repo root.
const ROOT = process.cwd();
const SRC = join(ROOT, 'src');

// ---------------------------------------------------------------------------
// Specs and sources
// ---------------------------------------------------------------------------

const officialHost = (url: string) => {
  const u = new URL(url);
  return u.protocol === 'https:' && OFFICIAL_DOMAINS.some((d) => u.hostname === d || u.hostname.endsWith(`.${d}`));
};

describe('id-documents: official specs', () => {
  it('every page cites at least one https source on an official domain', () => {
    for (const p of ID_PAGES) {
      expect(p.sources.length, p.slug).toBeGreaterThan(0);
      for (const s of p.sources) expect(officialHost(s.url), s.url).toBe(true);
    }
    for (const n of ID_NOT_COVERED) expect(officialHost(n.url), n.url).toBe(true);
  });

  it('keeps the checked date and the exact disclaimer text', () => {
    expect(ID_CHECKED_ON).toBe('2026-10-22');
    expect(ID_CHECKED_LABEL.en).toBe('Checked on 22 Oct 2026');
    expect(ID_DISCLAIMER.en).toBe('Not affiliated with NSDL, UTIITSL or UIDAI. Please verify on the official website.');
    expect(ID_PRIVACY.en).toBe('Processed on your device. Never uploaded or stored.');
  });

  it('presets match the published table (3.5×2.5 cm / 2×4.5 cm, 200 DPI, JPEG, 20 / 10 KB)', () => {
    expect(PAN_PHOTO_SPEC).toMatchObject({ widthPx: cmToPx(2.5, 200), heightPx: cmToPx(3.5, 200), maxKB: 20, dpi: 200, format: 'jpg' });
    expect([PAN_PHOTO_SPEC.widthPx, PAN_PHOTO_SPEC.heightPx]).toEqual([197, 276]);
    expect(PAN_SIGNATURE_SPEC).toMatchObject({ widthPx: 354, heightPx: 157, maxKB: 10, dpi: 200, format: 'jpg' });
    for (const p of ID_PAGES) {
      expect(p.sources[0]!.quote).toContain(`Max. ${p.official.maxKB} KB`);
      expect(p.sources[0]!.quote).toContain(p.official.dimension);
    }
  });

  it('section copy never claims to be official or names a government emblem', () => {
    const all = JSON.stringify([hubCopy('en'), hubCopy('hi'), panPhotoCopy('en'), panPhotoCopy('hi'), panSignatureCopy()]);
    expect(all).not.toMatch(/official (tool|site|portal)|PAN portal|government of india|emblem|ashoka/i);
  });
});

// ---------------------------------------------------------------------------
// SEO copy
// ---------------------------------------------------------------------------

const pages: [string, ToolCopy][] = [
  ['en photo', panPhotoCopy('en')],
  ['hi photo', panPhotoCopy('hi')],
  ['en signature', panSignatureCopy()],
];

/** Word 3-shingles, lower-cased, punctuation stripped. */
function shingles(text: string): Set<string> {
  const w = text
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
  const out = new Set<string>();
  for (let i = 0; i + 2 < w.length; i++) out.add(`${w[i]} ${w[i + 1]} ${w[i + 2]}`);
  return out;
}
function body(c: ToolCopy): string {
  return [c.intro, ...c.steps.flatMap((s) => [s.name, s.text]), ...c.faq.flatMap((f) => [f.q, f.a]), ...c.sections.flatMap((s) => [s.h2, ...s.paras, ...(s.list ?? [])])].join(' ');
}
function jaccard(a: string, b: string): number {
  const A = shingles(a);
  const B = shingles(b);
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter || 1);
}

describe('id-documents: SEO copy', () => {
  it.each(pages)('%s: title ≤ 60, description 120–155, 400–700 words', (_n, c) => {
    expect([...c.title].length).toBeLessThanOrEqual(60);
    expect([...c.description].length).toBeGreaterThanOrEqual(120);
    expect([...c.description].length).toBeLessThanOrEqual(155);
    const n = wordCount(c);
    expect(n).toBeGreaterThanOrEqual(400);
    expect(n).toBeLessThanOrEqual(700);
    expect(c.steps.length).toBeGreaterThanOrEqual(3);
    expect(c.faq.length).toBeGreaterThanOrEqual(3);
  });

  it.each(['en', 'hi'] as const)('hub %s: title ≤ 60, description 120–155', (lang) => {
    const c = hubCopy(lang);
    expect([...c.title].length).toBeLessThanOrEqual(60);
    expect([...c.description].length).toBeGreaterThanOrEqual(120);
    expect([...c.description].length).toBeLessThanOrEqual(155);
  });

  it('copy is unique: Jaccard (word 3-shingles) ≤ 0.45 between pages and against nearby tool pages', () => {
    const texts: [string, string][] = [
      ...pages.map(([n, c]) => [n, body(c)] as [string, string]),
      ['tool signature-resize', body(signatureCopy('en'))],
      ['tool resize-image', body(resizeCopy('en'))],
      ['tool compress-20kb', body(compressKbCopy(20, 'en'))],
      ['tool hi signature-resize', body(signatureCopy('hi'))],
      ['tool hi resize-image', body(resizeCopy('hi'))],
    ];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < texts.length; j++) {
        if (i === j) continue;
        const s = jaccard(texts[i]![1], texts[j]![1]);
        expect(s, `${texts[i]![0]} vs ${texts[j]![0]}`).toBeLessThanOrEqual(0.45);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Islands: no number fields, no persistence
// ---------------------------------------------------------------------------

/** Values that must never be typeable anywhere in the section. */
const PAN_LIKE = 'ABCDE1234F';
const AADHAAR_LIKE = '234512341234';

let root: HTMLDivElement;
beforeEach(() => {
  resetMock();
  configureAnalytics(() => {});
  URL.createObjectURL = vi.fn(() => `blob:mock/${Math.random()}`);
  URL.revokeObjectURL = vi.fn();
  root = document.createElement('div');
  document.body.appendChild(root);
});
afterEach(() => {
  act(() => render(null, root));
  configureAnalytics(null);
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

const tick = () => act(async () => void (await new Promise((r) => setTimeout(r, 10))));
async function waitFor(fn: () => boolean, what: string, ms = 4000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (fn()) return;
    await tick();
  }
  throw new Error(`timed out waiting for ${what}; text=${root.textContent?.slice(0, 400)}`);
}
const has = (s: string) => root.textContent?.includes(s) ?? false;
async function mount(node: ComponentChild) {
  await act(async () => render(node, root));
}
async function pick() {
  const input = root.querySelector('[data-testid="gallery-input"]') as HTMLInputElement;
  Object.defineProperty(input, 'files', { value: [new File([TINY_JPEG], 'p.jpg', { type: 'image/jpeg' })], configurable: true });
  await act(async () => {
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
}
function button(re: RegExp): HTMLButtonElement {
  const b = [...root.querySelectorAll('button')].find((x) => re.test(x.textContent ?? ''));
  if (!b) throw new Error(`no button ${re}`);
  return b as HTMLButtonElement;
}

/** Every input either takes no typed text, or is numeric and rejects PAN/Aadhaar strings. */
function assertNoIdNumberInputs() {
  const inputs = [...root.querySelectorAll('input, textarea, [contenteditable="true"]')] as HTMLInputElement[];
  for (const el of inputs) {
    const label = `${el.tagName} ${el.getAttribute('type')} ${el.id} ${el.getAttribute('name')} ${el.getAttribute('aria-label')}`;
    expect(label, 'no PAN/Aadhaar/name field').not.toMatch(/\bpan\b|aadha+r|\bname\b|uid/i);
    const type = (el.getAttribute('type') ?? 'text').toLowerCase();
    if (el.tagName === 'INPUT' && ['file', 'range', 'checkbox', 'radio', 'number', 'hidden'].includes(type)) {
      if (type === 'number') {
        // A number field cannot hold a PAN; a 12-digit Aadhaar must be out of range.
        const max = Number(el.getAttribute('max') ?? Infinity);
        expect(Number(AADHAAR_LIKE) > max || el.getAttribute('max') === null, label).toBe(true);
        el.value = PAN_LIKE;
        expect(el.value, label).toBe('');
      }
      continue;
    }
    throw new Error(`free-text input in an id-documents tool: ${label}`);
  }
}

describe('id-documents: islands', () => {
  it('photo tool: only a file picker, fits to the official spec, stores nothing', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const idbOpen = vi.spyOn(indexedDB, 'open');
    const d = toolDict('en');
    await mount(<IdPhotoTool lang="en" dict={d} tool="pan-card-photo-size" spec={PAN_PHOTO_SPEC} target="Target: 197×276 px" />);
    assertNoIdNumberInputs();
    expect(root.querySelectorAll('input[type="number"], input[type="text"], textarea').length).toBe(0);
    await pick();
    await waitFor(() => has('Crop'), 'cropper');
    await act(async () => button(/Auto-fit/).click());
    await waitFor(() => has('Ready:'), 'result');
    expect(has('197×276')).toBe(true);
    assertNoIdNumberInputs();
    expect(setItem).not.toHaveBeenCalled();
    expect(idbOpen).not.toHaveBeenCalled();
  });

  it('signature tool: official preset first, no ID fields, stores nothing', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const idbOpen = vi.spyOn(indexedDB, 'open');
    await mount(
      <IdSignatureTool lang="en" dict={toolDict('en')} tool="pan-card-signature-size" spec={PAN_SIGNATURE_SPEC} label="354×157 px, under 10 KB" sub="Protean" />,
    );
    assertNoIdNumberInputs();
    await pick();
    await waitFor(() => has('Crop'), 'cropper');
    await act(async () => button(/Auto-fit/).click());
    await waitFor(() => has('Ready:'), 'result');
    expect(has('354×157')).toBe(true);
    assertNoIdNumberInputs();
    expect(setItem).not.toHaveBeenCalled();
    expect(idbOpen).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Persistence off: static import graph of the section
// ---------------------------------------------------------------------------

const ENTRY = [
  'src/islands/id-documents/IdPhotoTool.tsx',
  'src/islands/id-documents/IdSignatureTool.tsx',
];

function resolveImport(from: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith('@/')) base = join(SRC, spec.slice(2));
  else if (spec.startsWith('.')) base = resolve(dirname(from), spec);
  else return null;
  for (const ext of ['', '.ts', '.tsx', '/index.ts', '/index.tsx']) {
    const p = base + ext;
    if (existsSync(p) && !p.endsWith('/') && /\.(tsx?|json)$/.test(p)) return p;
  }
  return null;
}

/** Value imports only: `import type` is erased and never reaches the bundle. */
function imports(file: string): string[] {
  const src = readFileSync(file, 'utf8');
  const out: string[] = [];
  for (const m of src.matchAll(/^\s*(import|export)\s+(?!type\s)[^;'"]*?from\s+['"]([^'"]+)['"]/gm)) out.push(m[2]!);
  for (const m of src.matchAll(/^\s*import\s+['"]([^'"]+)['"]/gm)) out.push(m[1]!);
  for (const m of src.matchAll(/\bimport\(\s*['"]([^'"]+)['"]\s*\)/g)) out.push(m[1]!);
  return out;
}

describe('id-documents: persistence is off', () => {
  it('no module reachable from the section islands imports the kit store, idb-keyval or web storage', () => {
    const seen = new Set<string>();
    const stack = ENTRY.map((e) => join(ROOT, e));
    const bad: string[] = [];
    while (stack.length) {
      const f = stack.pop()!;
      if (seen.has(f)) continue;
      seen.add(f);
      // The engine runs in a worker and only sees pixels; it is checked by its own suite.
      if (f.includes('/src/engine/')) continue;
      for (const spec of imports(f)) {
        if (spec === 'idb-keyval' || spec === '@/lib/kit-store' || /kit-store$/.test(spec)) bad.push(`${f} -> ${spec}`);
        const r = resolveImport(f, spec);
        if (r) stack.push(r);
      }
      const text = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
      if (/\b(localStorage|sessionStorage|indexedDB)\b/.test(text)) bad.push(`${f} uses web storage`);
    }
    expect(seen.size).toBeGreaterThan(5);
    expect(bad).toEqual([]);
  });
});
