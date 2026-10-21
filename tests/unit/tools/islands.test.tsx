/** Tool islands against the mock engine (happy-dom). */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, type ComponentChild } from 'preact';
import { act } from 'preact/test-utils';
import { configureAnalytics, type FlatProps } from '@/lib/analytics';
import { TINY_JPEG, configureMock, resetMock } from '@/engine/mock';
import { toolDict } from '@/components/tools/dict';
import ToolCompress from '@/islands/tools/ToolCompress';
import ToolResize from '@/islands/tools/ToolResize';
import ToolConvert from '@/islands/tools/ToolConvert';
import ToolSignature from '@/islands/tools/ToolSignature';
import ToolImagesToPdf from '@/islands/tools/ToolImagesToPdf';
import ToolCompressPdf from '@/islands/tools/ToolCompressPdf';
import ToolPhotoSheet from '@/islands/tools/ToolPhotoSheet';
import ToolBatch from '@/islands/tools/ToolBatch';
import ToolCustomPreset from '@/islands/tools/ToolCustomPreset';
import ToolDeclaration from '@/islands/tools/ToolDeclaration';
import { inkSpec, type SizeOption } from '@/components/tools/logic';

vi.mock('@/engine/api', () => import('@/engine/mock'));

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

async function waitFor(fn: () => boolean, what: string, ms = 4000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (fn()) return;
    await tick();
  }
  throw new Error(`timed out waiting for ${what}; text=${root.textContent?.slice(0, 500)}`);
}

function button(text: string | RegExp): HTMLButtonElement {
  const all = [...root.querySelectorAll('button')] as HTMLButtonElement[];
  const b = all.find((x) => (typeof text === 'string' ? x.textContent?.includes(text) : text.test(x.textContent ?? '')));
  if (!b) throw new Error(`no button ${text}; have: ${all.map((x) => x.textContent).join(' | ')}`);
  return b;
}

const has = (s: string) => root.textContent?.includes(s) ?? false;

async function click(el: HTMLElement) {
  await act(async () => el.click());
}

function jpeg(name = 'My Secret Name.jpg'): File {
  return new File([TINY_JPEG], name, { type: 'image/jpeg' });
}

async function pick(files: File[]) {
  const input = root.querySelector('[data-testid="gallery-input"]') as HTMLInputElement;
  Object.defineProperty(input, 'files', { value: files, configurable: true });
  await act(async () => {
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

async function mount(node: ComponentChild) {
  await act(async () => render(node, root));
}

function noFileNamesInAnalytics() {
  const blob = JSON.stringify(events);
  expect(blob).not.toMatch(/Secret|\.jpg|\.pdf/);
}

describe('T1 ToolCompress', () => {
  it('compresses on pick to the preset target, shows the pass check and tracks tool_used', async () => {
    await mount(<ToolCompress lang="en" dict={dict} initialKB={20} />);
    expect(has('Processed on your device. Never uploaded.')).toBe(true);
    await pick([jpeg()]);
    await waitFor(() => has('Ready:'), 'result');
    expect(has('Pass check')).toBe(true);
    expect(has('18–20 KB')).toBe(true);
    const dl = button(/Download .*-20kb\.jpg/);
    expect(dl.disabled).toBe(false);
    expect(events.find((x) => x.e === 'tool_used')?.p).toEqual({ tool: 'compress-image', target: '20' });
    expect(events.some((x) => x.e === 'doc_uploaded')).toBe(true);
    noFileNamesInAnalytics();
  });

  it('rejects a minimum above the target', async () => {
    await mount(<ToolCompress lang="en" dict={dict} initialKB={20} />);
    const min = [...root.querySelectorAll('input[type="number"]')].find((i) =>
      (i as HTMLInputElement).placeholder === 'Optional',
    ) as HTMLInputElement;
    await act(async () => {
      min.value = '30';
      min.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(has('The minimum is bigger than the target')).toBe(true);
  });

  it('shows the engine error in plain words', async () => {
    configureMock({ failFit: { other: 'TOO_DETAILED' } });
    await mount(<ToolCompress lang="en" dict={dict} initialKB={10} />);
    await pick([jpeg()]);
    await waitFor(() => has('too much detail'), 'error');
    expect(events.some((x) => x.e === 'error' && x.p.code === 'TOO_DETAILED')).toBe(true);
  });
});

describe('T2 ToolResize / T3 ToolConvert', () => {
  it('resizes to the source pixels by default and tracks the target', async () => {
    await mount(<ToolResize lang="en" dict={dict} />);
    await pick([jpeg()]);
    await waitFor(() => has('Ready:'), 'resize result');
    expect(events.find((x) => x.e === 'tool_used')?.p).toEqual({ tool: 'resize-image', target: '16x16' });
    expect(has('In pixels')).toBe(false);
  });

  it('converts to the chosen format with a format check', async () => {
    await mount(<ToolConvert lang="en" dict={dict} />);
    await pick([jpeg()]);
    await waitFor(() => has('Ready:'), 'convert result');
    expect(root.querySelector('[data-rule="format"]')?.getAttribute('data-pass')).toBe('true');
    expect(events.find((x) => x.e === 'tool_used')?.p).toEqual({ tool: 'convert-image', target: 'jpg' });
  });
});

describe('T4 ToolSignature', () => {
  it('crops, cleans and fits to the chosen preset', async () => {
    const options: SizeOption[] = [
      { id: 'ibps', label: '140×60 px, 10–20 KB', exams: 'IBPS PO', spec: inkSpec('signature', { w: 140, h: 60, minKB: 10, maxKB: 20, dpi: 200 })! },
    ];
    await mount(<ToolSignature lang="en" dict={dict} options={options} />);
    expect(has('IBPS PO')).toBe(true);
    await pick([jpeg()]);
    await waitFor(() => has('Crop'), 'cropper');
    await click(button('Auto-fit'));
    await waitFor(() => has('Ready:'), 'fit result');
    expect(has('140×60 px')).toBe(true);
    expect(events.find((x) => x.e === 'tool_used')?.p).toEqual({ tool: 'signature-resize', target: '140x60:10-20' });
    button(/Download sign\.jpg/);
  });
});

describe('T6 ToolImagesToPdf', () => {
  it('adds files, reorders with Alt+ArrowDown and makes a PDF under the limit', async () => {
    await mount(<ToolImagesToPdf lang="en" dict={dict} />);
    await pick([jpeg('a.jpg'), jpeg('b.jpg')]);
    const rows = () => [...root.querySelectorAll('ol li')].map((li) => li.textContent ?? '');
    expect(rows()[0]).toContain('a.jpg');
    const first = root.querySelector('ol li [data-handle]') as HTMLElement;
    await act(async () => {
      first.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true, bubbles: true }));
    });
    expect(rows()[0]).toContain('b.jpg');
    expect(has('Moved to position 2 of 2')).toBe(true);
    await click(button('Make PDF'));
    await waitFor(() => has('Ready:'), 'pdf result');
    expect(root.querySelector('[data-rule="size"]')?.getAttribute('data-pass')).toBe('true');
    expect(events.find((x) => x.e === 'tool_used')?.p).toEqual({ tool: 'images-to-pdf', target: '300' });
    noFileNamesInAnalytics();
  });
});

describe('T7 ToolCompressPdf', () => {
  it('reports "already small" for a PDF under the limit', async () => {
    await mount(<ToolCompressPdf lang="en" dict={dict} />);
    await pick([new File([new TextEncoder().encode('%PDF-1.4 small')], 'x.pdf', { type: 'application/pdf' })]);
    await click(button('Compress to 300 KB'));
    await waitFor(() => has('already'), 'already small');
    expect(has('Upload your original file as it is.')).toBe(true);
    expect(has('text can no longer be selected')).toBe(true);
  });

  it('stops on a mostly-text PDF with a clear message, then "Compress anyway" runs', async () => {
    configureMock({ textOnlyPdf: true });
    await mount(<ToolCompressPdf lang="en" dict={dict} />);
    await pick([new File([new Uint8Array(400_000).fill(32)], 'notes.pdf', { type: 'application/pdf' })]);
    await click(button('Compress to 300 KB'));
    await waitFor(() => has('mostly text'), 'text-only message');
    expect(has('blurry image')).toBe(true);
    expect(events.find((x) => x.e === 'error')?.p).toEqual({ code: 'PDF_TEXT_ONLY', tool: 'compress-pdf' });
    await click(button('Compress anyway'));
    await waitFor(() => has('Ready:'), 'forced result');
    expect(has('mostly text')).toBe(false);
  });

  it('refuses a non-PDF', async () => {
    await mount(<ToolCompressPdf lang="en" dict={dict} />);
    await pick([jpeg()]);
    expect(has('This is not a PDF')).toBe(true);
  });
});

describe('T8 ToolPhotoSheet', () => {
  it('limits copies on 4×6 paper and makes a sheet', async () => {
    await mount(<ToolPhotoSheet lang="en" dict={dict} />);
    const radio = (v: string) => [...root.querySelectorAll('input[type="radio"]')].find((r) => (r as HTMLInputElement).value === v) as HTMLInputElement;
    expect(radio('8').disabled).toBe(true);
    expect(radio('4').disabled).toBe(false);
    await pick([jpeg()]);
    await waitFor(() => has('Make sheet'), 'make button');
    await click(button('Make sheet'));
    await waitFor(() => has('Ready:'), 'sheet');
    expect(events.find((x) => x.e === 'tool_used')?.p).toEqual({ tool: 'passport-photo-sheet', target: '4:4x6:pdf' });
  });
});

describe('T9 ToolBatch', () => {
  it('processes files one by one and offers a ZIP', async () => {
    await mount(<ToolBatch lang="en" dict={dict} />);
    await pick([jpeg('1.jpg'), jpeg('2.jpg'), jpeg('3.jpg')]);
    await click(button('Compress 3 images to 50 KB'));
    await waitFor(() => has('Download 3 files (ZIP)'), 'zip button');
    await click(button('Download 3 files (ZIP)'));
    await waitFor(() => events.some((x) => x.e === 'doc_downloaded'), 'zip download');
    noFileNamesInAnalytics();
  });

  it('stops before the next file', async () => {
    configureMock({ latencyMs: 30 });
    await mount(<ToolBatch lang="en" dict={dict} />);
    await pick([jpeg('1.jpg'), jpeg('2.jpg'), jpeg('3.jpg'), jpeg('4.jpg')]);
    await click(button('Compress 4 images'));
    await waitFor(() => has('Stop after this image'), 'stop button');
    await click(button('Stop after this image'));
    await waitFor(() => has('Finished:'), 'finished', 6000);
    expect(has('Stopped')).toBe(true);
  });
});

describe('T10 ToolCustomPreset', () => {
  it('reads the shareable query and keeps it in the URL', async () => {
    // Earlier download clicks can move happy-dom's location; reset it to a page URL.
    const url = 'http://localhost:3000/tools/custom-preset?w=140&h=60&min=10&max=20&dpi=200&fmt=jpg';
    const hd = (window as unknown as { happyDOM?: { setURL(u: string): void } }).happyDOM;
    if (hd) hd.setURL(url);
    else history.replaceState(null, '', url);
    await mount(<ToolCustomPreset lang="en" dict={dict} />);
    const nums = () => [...root.querySelectorAll('input[type="number"]')].map((i) => (i as HTMLInputElement).value);
    await waitFor(() => nums()[0] === '140', `query applied (${nums().join(',')}) ${location.search}`, 1000);
    expect(nums()).toEqual(['140', '60', '10', '20', '200']);
    const share = root.querySelector('#custom-share') as HTMLInputElement;
    expect(share.value).toContain('?w=140&h=60&min=10&max=20&dpi=200&fmt=jpg');
    await pick([jpeg()]);
    await waitFor(() => has('Auto-fit'), 'cropper');
    await click(button('Auto-fit'));
    await waitFor(() => has('Ready:'), 'fit');
    expect(events.find((x) => x.e === 'tool_used')?.p).toEqual({ tool: 'custom-preset', target: '140x60:10-20' });
  });
});

describe('Declaration tool', () => {
  it('fills the name into the exam text and offers the trace sheet', async () => {
    const exams = [{ slug: 'ibps-po', name: 'IBPS PO', text: 'I, _______ (Name of the candidate), hereby declare.', toVerify: false }];
    await mount(<ToolDeclaration lang="en" dict={dict} exams={exams} options={[]} />);
    const name = root.querySelector('input[autocomplete="name"]') as HTMLInputElement;
    await act(async () => {
      name.value = 'Asha Kumari';
      name.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(has('I, Asha Kumari, hereby declare.')).toBe(true);
    button('Download trace sheet');
    expect(has('Custom size')).toBe(true);
  });
});
