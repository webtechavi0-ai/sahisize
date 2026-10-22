/**
 * /tools/increase-image-size-in-kb and /tools/name-date-on-photo: pure logic and the two
 * islands against the mock engine (happy-dom). fit() is wrapped in a spy so the tests can
 * check what the islands ask the engine for (min KB, same pixels, the name/date strip).
 */
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { render, type ComponentChild } from 'preact';
import { act } from 'preact/test-utils';
import { configureAnalytics, type FlatProps } from '@/lib/analytics';
import { TINY_JPEG, resetMock } from '@/engine/mock';
import * as api from '@/engine/api';
import { toolDict } from '@/components/tools/dict';
import ToolIncrease from '@/islands/tools/ToolIncrease';
import ToolNameDate from '@/islands/tools/ToolNameDate';
import {
  DEFAULT_MAX_FOR_MIN,
  INCREASE_MIN_PRESETS,
  alreadyAboveMin,
  defaultMaxKB,
  increaseFitOptions,
  increaseSpec,
  increaseTarget,
  validateIncrease,
} from '@/components/tools/increase';
import {
  cleanNameDate,
  nameDateCustomSpec,
  nameDateError,
  nameDateFitOptions,
} from '@/components/tools/name-date';
import { fixedSpec, type SizeOption } from '@/components/tools/logic';

vi.mock('@/engine/api', async () => {
  const m = await import('@/engine/mock');
  return { ...m, fit: vi.fn(m.fit) };
});

const fitSpy = api.fit as unknown as Mock;
const dict = toolDict('en');
let root: HTMLDivElement;
let events: { e: string; p: FlatProps }[];

beforeEach(() => {
  resetMock();
  fitSpy.mockClear();
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
async function waitFor(fn: () => boolean, what: string, ms = 4000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (fn()) return;
    await tick();
  }
  throw new Error(`timed out waiting for ${what}; text=${root.textContent?.slice(0, 500)}`);
}
const has = (s: string) => root.textContent?.includes(s) ?? false;
function button(text: string | RegExp): HTMLButtonElement {
  const all = [...root.querySelectorAll('button')] as HTMLButtonElement[];
  const b = all.find((x) => (typeof text === 'string' ? x.textContent?.includes(text) : text.test(x.textContent ?? '')));
  if (!b) throw new Error(`no button ${text}; have: ${all.map((x) => x.textContent).join(' | ')}`);
  return b;
}
async function mount(node: ComponentChild) {
  await act(async () => render(node, root));
}
async function pick(file: File) {
  const input = root.querySelector('[data-testid="gallery-input"]') as HTMLInputElement;
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  await act(async () => {
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
}
async function type(input: HTMLInputElement, value: string) {
  await act(async () => {
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
function inputByLabel(text: string): HTMLInputElement {
  const label = [...root.querySelectorAll('label')].find((l) => l.textContent?.startsWith(text));
  if (!label) throw new Error(`no label ${text}`);
  return root.querySelector(`#${CSS.escape(label.getAttribute('for')!)}`) as HTMLInputElement;
}
const jpeg = (name = 'My Secret Name.jpg') => new File([TINY_JPEG], name, { type: 'image/jpeg' });

// ---------------------------------------------------------------------------
// Pure logic
// ---------------------------------------------------------------------------

describe('increase logic', () => {
  it('validates the range', () => {
    expect(validateIncrease(20, 50)).toBeNull();
    expect(validateIncrease(null, 50)).toBe('minInvalid');
    expect(validateIncrease(2, 50)).toBe('minInvalid');
    expect(validateIncrease(20, null)).toBe('maxInvalid');
    expect(validateIncrease(20, 9000)).toBe('maxInvalid');
    expect(validateIncrease(50, 50)).toBe('maxBelowMin');
    expect(validateIncrease(60, 50)).toBe('maxBelowMin');
  });

  it('has a starting maximum for every chip and doubles a custom minimum', () => {
    for (const n of INCREASE_MIN_PRESETS) expect(DEFAULT_MAX_FOR_MIN[n]).toBeGreaterThan(n);
    expect(defaultMaxKB(20)).toBe(50);
    expect(defaultMaxKB(30)).toBe(49);
    expect(defaultMaxKB(15)).toBe(30);
    expect(defaultMaxKB(4000)).toBe(5000);
  });

  it('builds a KB-only spec with the minimum and keeps pixels by default', () => {
    const s = increaseSpec(20, 50);
    expect(s).toMatchObject({ doc: 'other', widthPx: null, heightPx: null, minKB: 20, maxKB: 50, format: 'jpg' });
    expect(increaseFitOptions(true)).toEqual({ keepSourceDims: true, allowDownscale: false });
    expect(increaseFitOptions(false)).toEqual({ keepSourceDims: true, allowDownscale: true });
    expect(alreadyAboveMin(20 * 1024, 20)).toBe(true);
    expect(alreadyAboveMin(20 * 1024 - 1, 20)).toBe(false);
    expect(increaseTarget(20, 50)).toBe('20-50');
  });
});

describe('name-date logic', () => {
  it('cleans and checks the text', () => {
    expect(cleanNameDate({ name: '  Asha   Verma ', date: ' 21/10/2026 ' })).toEqual({ name: 'Asha Verma', date: '21/10/2026' });
    expect(cleanNameDate({ name: 'x'.repeat(60), date: '1'.repeat(20) }).name).toHaveLength(40);
    expect(nameDateError({ name: ' ', date: '21/10/2026' })).toBe('nameMissing');
    expect(nameDateError({ name: 'Asha', date: '' })).toBe('dateMissing');
    expect(nameDateError({ name: 'Asha', date: '21/10/2026' })).toBeNull();
    expect(nameDateFitOptions({ name: ' Asha ', date: '21/10/2026' })).toEqual({ nameDate: { name: 'Asha', date: '21/10/2026' } });
  });

  it('builds custom specs that always ask for the strip', () => {
    const passport = nameDateCustomSpec({ w: null, h: null, minKB: null, maxKB: 50 })!;
    expect(passport).toMatchObject({ doc: 'photo', widthPx: null, minKB: null, maxKB: 50, needsNameDateStrip: true });
    expect(nameDateCustomSpec({ w: 350, h: 450, minKB: 25, maxKB: 100 })).toMatchObject({ widthPx: 350, heightPx: 450, minKB: 25 });
    expect(nameDateCustomSpec({ w: 350, h: null, minKB: null, maxKB: 50 })).toBeNull();
    expect(nameDateCustomSpec({ w: null, h: null, minKB: 60, maxKB: 50 })).toBeNull();
    expect(nameDateCustomSpec({ w: null, h: null, minKB: null, maxKB: null })).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Islands
// ---------------------------------------------------------------------------

describe('ToolIncrease', () => {
  it('raises to the chosen minimum on pick, keeps pixels and tracks tool_used', async () => {
    await mount(<ToolIncrease lang="en" dict={dict} initialMinKB={20} />);
    expect(has('Processed on your device. Never uploaded.')).toBe(true);
    expect(has('Your file will be 20–50 KB.')).toBe(true);
    await pick(jpeg());
    await waitFor(() => has('Ready:'), 'result');
    const [, spec, opts] = fitSpy.mock.calls.at(-1)!;
    expect(spec).toMatchObject({ minKB: 20, maxKB: 50, widthPx: null });
    expect(opts).toEqual({ keepSourceDims: true, allowDownscale: false });
    expect(button(/Download .*-20kb\.jpg/).disabled).toBe(false);
    expect(events.find((x) => x.e === 'tool_used')?.p).toEqual({ tool: 'increase-image-size-in-kb', target: '20-50' });
    expect(JSON.stringify(events)).not.toMatch(/Secret|\.jpg/);
  });

  it('a chip resets the maximum; a maximum below the minimum is refused', async () => {
    await mount(<ToolIncrease lang="en" dict={dict} initialMinKB={20} />);
    await act(async () => {
      (root.querySelector('input[type="radio"][value="10"]') as HTMLInputElement).click();
    });
    expect(has('Your file will be 10–20 KB.')).toBe(true);
    await type(inputByLabel('Maximum size'), '5');
    expect(has('The maximum must be bigger than the minimum.')).toBe(true);
  });

  it('says when the file is already above the minimum', async () => {
    await mount(<ToolIncrease lang="en" dict={dict} initialMinKB={10} />);
    const big = new File([TINY_JPEG, new Uint8Array(12 * 1024)], 'big.jpg', { type: 'image/jpeg' });
    await pick(big);
    await waitFor(() => has('Ready:'), 'result');
    expect(has('above 10 KB')).toBe(true);
  });
});

describe('ToolNameDate', () => {
  const options: SizeOption[] = [
    {
      id: 'mppsc-photo',
      label: 'MPPSC: 350×450 px, 25–100 KB',
      exams: 'Photograph with name and date',
      spec: { ...fixedSpec({ doc: 'photo', w: 350, h: 450, minKB: 25, maxKB: 100, fileName: 'photo.jpg' }), needsNameDateStrip: true },
    },
  ];

  it('needs a name, passes it only to the engine, never to analytics', async () => {
    await mount(<ToolNameDate lang="en" dict={dict} options={options} />);
    expect(has('MPPSC: 350×450 px, 25–100 KB')).toBe(true);
    const date = inputByLabel('Date to print');
    expect(date.value).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    await pick(jpeg());
    await waitFor(() => has('Crop your photo'), 'cropper');
    expect(button('Add name and date').disabled).toBe(true);
    expect(has('Type the name to print on the photo.')).toBe(true);

    await type(inputByLabel('Name to print'), '  Asha  Verma ');
    await type(date, '21/10/2026');
    await act(async () => button('Add name and date').click());
    await waitFor(() => has('Ready:'), 'result');

    const [, spec, opts] = fitSpy.mock.calls.at(-1)!;
    expect(spec).toMatchObject({ widthPx: 350, heightPx: 450, needsNameDateStrip: true });
    expect(opts).toEqual({ nameDate: { name: 'Asha Verma', date: '21/10/2026' } });
    expect(button(/Download photo\.jpg/).disabled).toBe(false);
    expect(events.find((x) => x.e === 'tool_used')?.p).toEqual({ tool: 'name-date-on-photo', target: '350x450:25-100' });
    const blob = JSON.stringify(events);
    expect(blob).not.toMatch(/Asha|Verma|21\/10\/2026|Secret/);
  });

  it('custom size with empty px makes a passport-size photo', async () => {
    await mount(<ToolNameDate lang="en" dict={dict} options={[]} />);
    await pick(jpeg());
    await type(inputByLabel('Name to print'), 'Ravi');
    await waitFor(() => !button('Add name and date').disabled, 'enabled');
    await act(async () => button('Add name and date').click());
    await waitFor(() => has('Ready:'), 'result');
    expect(has('413×531 px')).toBe(true);
    expect(fitSpy.mock.calls.at(-1)![1]).toMatchObject({ doc: 'photo', widthPx: null, needsNameDateStrip: true });
    button(/Download photo-name-date\.jpg/);
  });
});
