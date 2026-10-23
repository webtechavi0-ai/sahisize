import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { getNamespace } from '@/i18n';
import { configureAnalytics, type FlatProps } from '@/lib/analytics';
import { __resetKitStoreForTests, flushKit } from '@/lib/kit-store';
import KitFlow from '@/islands/KitFlow';
import type { KitPreset } from '@/components/kit/kit-types';
import { TINY_JPEG, configureMock, resetMock } from '@/engine/mock';
import type * as ZipModule from '@/engine/zip';

vi.mock('@/engine/api', () => import('@/engine/mock'));

const dict = getNamespace('en', 'common', 'ui', 'kit');

const L = (en: string) => ({ en, hi: en });
let n = 0;

function ibpsLike(): KitPreset {
  return {
    slug: `ibps-test-${++n}`,
    name: L('IBPS PO'),
    body: 'IBPS',
    cycle: '2026',
    hash: 'h1',
    liveCaptureAlso: true,
    photoUploadReplacedByLive: false,
    declarationText: { en: 'I, _______ (Name of the candidate), hereby declare that all is true.' },
    source: {
      notification: 'CRP PO/MT-XVI',
      url: 'https://www.ibps.in/notice.pdf',
      lastChecked: '2026-07-01',
    },
    docs: [
      {
        key: 'photo',
        spec: {
          doc: 'photo',
          label: L('Photograph'),
          widthPx: 200,
          heightPx: 230,
          minKB: 20,
          maxKB: 50,
          format: 'jpg',
          dpi: 200,
          fileName: 'photo.jpg',
          rules: [],
        },
        captureTip: L('Stand against a plain wall.'),
      },
      {
        key: 'signature',
        spec: {
          doc: 'signature',
          label: L('Signature'),
          widthPx: 140,
          heightPx: 60,
          minKB: 10,
          maxKB: 20,
          format: 'jpg',
          dpi: 200,
          fileName: 'sign.jpg',
          rules: [],
          cleanup: 'signature',
        },
        variant: 'triple',
      },
      {
        key: 'certificate',
        spec: {
          doc: 'certificate',
          label: L('10th certificate'),
          widthPx: null,
          heightPx: null,
          minKB: 50,
          maxKB: 300,
          format: 'pdf',
          dpi: null,
          fileName: 'cert.pdf',
          rules: [],
        },
      },
    ],
  };
}

const events: { e: string; p: FlatProps }[] = [];
let root: HTMLElement;

beforeEach(() => {
  __resetKitStoreForTests();
  resetMock();
  events.length = 0;
  configureAnalytics((e, p) => events.push({ e, p }));
  URL.createObjectURL = vi.fn(() => `blob:mock/${Math.random()}`);
  URL.revokeObjectURL = vi.fn();
  root = document.createElement('div');
  document.body.appendChild(root);
});

afterEach(async () => {
  act(() => render(null, root));
  await flushKit();
  configureAnalytics(null);
  document.body.innerHTML = '';
});

const tick = () => act(async () => void (await new Promise((r) => setTimeout(r, 5))));

async function waitFor(fn: () => boolean, what = 'condition', ms = 3000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (fn()) return;
    await tick();
  }
  throw new Error(
    `timed out waiting for ${what}; screen=${screen()} text=${root.textContent?.slice(0, 400)}`,
  );
}

const screen = () => root.querySelector('[data-screen]')?.getAttribute('data-screen');
const ready = () => root.querySelector('[data-ready="1"]') !== null;

function button(text: string | RegExp): HTMLButtonElement {
  const all = [...root.querySelectorAll('button')] as HTMLButtonElement[];
  const b = all.find((x) =>
    typeof text === 'string' ? x.textContent?.includes(text) : text.test(x.textContent ?? ''),
  );
  if (!b) throw new Error(`no button ${text}; have: ${all.map((x) => x.textContent).join(' | ')}`);
  return b;
}

async function click(el: HTMLElement) {
  await act(async () => {
    el.click();
  });
}

function jpegFile(name: string, size?: number): File {
  const f = new File([TINY_JPEG], name, { type: 'image/jpeg' });
  if (size) Object.defineProperty(f, 'size', { value: size });
  return f;
}

async function pick(files: File[]) {
  const input = root.querySelector('[data-testid="gallery-input"]') as HTMLInputElement;
  Object.defineProperty(input, 'files', { value: files, configurable: true });
  await act(async () => {
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

async function mount(preset: KitPreset, extra: Record<string, unknown> = {}) {
  await act(async () => {
    render(<KitFlow preset={preset} lang="en" dict={dict} {...extra} />, root);
  });
  await waitFor(ready, 'ready');
}

describe('KitFlow (K2, K5, K7-K10, K13, K14)', () => {
  it('walks checklist -> upload -> crop -> auto-fit -> result -> summary -> ZIP, and restores after reload', async () => {
    const preset = ibpsLike();
    await mount(preset);

    // K2 checklist
    expect(screen()).toBe('checklist');
    expect(root.querySelectorAll('[data-doc]').length).toBe(3);
    expect(root.textContent).toContain('200×230 px · 20–50 KB · JPG');
    expect(root.textContent).toContain('A live photo is also taken in the form');

    // photo
    await click(button('Start with Photograph'));
    expect(screen()).toBe('upload');
    expect(root.textContent).toContain('Stand against a plain wall.');
    expect(root.textContent).toContain('Processed on your device. Never uploaded.');
    expect(root.textContent).toContain('Step 1 of 3 · Photograph');
    expect(root.textContent).toContain('exactly the size IBPS PO asks for');
    // Auto-crop + auto-fit run straight after the upload: the user only confirms.
    await pick([jpegFile('Rahul_Sharma_photo.jpg')]);
    await waitFor(() => screen() === 'result', 'result screen');
    expect(root.querySelector('[data-rule="size"]')?.getAttribute('data-pass')).toBe('true');
    expect(root.textContent).toContain('Ready for IBPS PO');
    expect(root.querySelector('[role="status"]')?.textContent).toContain('Photograph is ready');
    // "Adjust crop" opens the cropper; "Use this crop" fits again.
    await click(button('Adjust crop'));
    expect(screen()).toBe('crop');
    expect(root.textContent).toContain('Fit your face inside the oval');
    await waitFor(() => !button('Use this crop').disabled, 'apply enabled');
    await click(button('Use this crop'));
    await waitFor(() => screen() === 'result', 'result after adjust');

    // signature (triple variant guidance + cleanup toggle)
    await click(button('Looks good — Next: Signature'));
    expect(screen()).toBe('upload');
    expect(root.textContent).toContain('Sign three times');
    await pick([jpegFile('MySignScan.jpg')]);
    await waitFor(() => screen() === 'result', 'result 2');
    await click(button('Adjust crop'));
    expect(root.querySelector('[role="switch"]')?.getAttribute('aria-checked')).toBe('true');
    expect(root.textContent).toContain('80%');
    // Back from "Adjust crop" returns to the result unchanged.
    await click(root.querySelector('header button') as HTMLButtonElement);
    expect(screen()).toBe('result');

    // K14 certificate: two pages -> one PDF
    await click(button('Looks good — Next: 10th certificate'));
    expect(screen()).toBe('upload');
    await pick([
      jpegFile('page-one.jpg'),
      new File([new Uint8Array(10)], 'page-two.pdf', { type: 'application/pdf' }),
    ]);
    expect(root.textContent).toContain('Page 2');
    await click(button('Make PDF'));
    await waitFor(() => screen() === 'result', 'cert result');
    // mock PDF is tiny (< 50 KB min) -> size check fails, Finish disabled
    expect(root.querySelector('[data-rule="size"]')?.getAttribute('data-pass')).toBe('false');
    expect(button('Finish').disabled).toBe(true);

    // summary via checklist
    await click(button('Change pages'));
    await click(root.querySelector('header button') as HTMLButtonElement);
    expect(screen()).toBe('checklist');
    expect(root.textContent).toContain('2 of 3 done');
    // the failing certificate is not done: the primary action continues with it (its failed result)
    await click(button('Continue: 10th certificate'));
    expect(screen()).toBe('result');
    await click(root.querySelector('header button') as HTMLButtonElement);
    expect(screen()).toBe('checklist');

    const sigCard = root.querySelector('[data-doc="signature"]') as HTMLButtonElement;
    await click(sigCard);
    expect(screen()).toBe('result');

    // download one (K10) + ZIP
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await click(button('Download this file'));
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(events.some((x) => x.e === 'doc_downloaded' && x.p.doc === 'signature')).toBe(true);

    // reload: state restored from IndexedDB (K9)
    await act(async () => render(null, root));
    await flushKit();
    __resetKitStoreForTests();
    await mount(preset);
    expect(root.textContent).toContain('2 of 3 done');
    expect(screen()).toBe('result');
    await click(root.querySelector('header button') as HTMLButtonElement);
    expect(screen()).toBe('checklist');
    expect(root.textContent).toContain('Welcome back');

    // Start over (confirm dialog) clears everything
    await click(button('Start over'));
    expect(root.querySelector('[role="alertdialog"]')).not.toBeNull();
    await click(button('Yes, start over'));
    await waitFor(() => root.textContent!.includes('0 of 3 done'), 'cleared');
    clickSpy.mockRestore();

    // analytics (SPEC 11.1): expected events, never file names
    const names = events.map((x) => x.e);
    expect(names).toEqual(
      expect.arrayContaining(['kit_started', 'doc_uploaded', 'fit_done', 'doc_downloaded']),
    );
    const up = events.find((x) => x.e === 'doc_uploaded')!.p;
    expect(up).toEqual({ exam: preset.slug, doc: 'photo', inputFormat: 'jpg', kbBucket: '<20' });
    const fit = events.find((x) => x.e === 'fit_done')!.p;
    expect(fit).toMatchObject({ exam: preset.slug, doc: 'photo', pass: true });
    expect(typeof fit.ms).toBe('number');
    const blob = JSON.stringify(events);
    expect(blob).not.toMatch(/Rahul|Sharma|MySignScan|page-one|page-two|\.jpg|\.pdf/);
  });

  it('summary: ZIP download with file names from the preset, then feedback is queued', async () => {
    const preset = ibpsLike();
    preset.docs = preset.docs.slice(0, 2);
    await mount(preset);
    await click(button('Start with Photograph'));
    await pick([jpegFile('x.jpg')]);
    await waitFor(() => screen() === 'result', 'result');
    await click(button('Looks good — Next: Signature'));
    await pick([jpegFile('y.jpg')]);
    await waitFor(() => screen() === 'result', 'result 2');
    await click(button('Looks good — Finish'));
    expect(screen()).toBe('summary');
    expect(root.textContent).toContain('All 2 files ready');
    expect(root.textContent).toContain('What to do next');
    expect(root.textContent).toContain('Upload them on the IBPS website');
    expect(root.textContent).toContain('photo.jpg → Photograph');
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const engine = await import('@/engine/api');
    const zipSpy = vi.spyOn(engine, 'zip');
    await click(button('Download all (ZIP)'));
    await waitFor(() => events.some((x) => x.e === 'kit_zip_downloaded'), 'zip event');
    expect(zipSpy).toHaveBeenCalledWith(
      [
        expect.objectContaining({ name: 'photo.jpg' }),
        expect.objectContaining({ name: 'sign.jpg' }),
      ],
      expect.stringContaining('{{files}}'),
    );
    // README (SPEC 7.7): one file listing (engine placeholder) plus the spec source
    const { buildZip } = await vi.importActual<typeof ZipModule>('@/engine/zip');
    const { unzipSync, strFromU8 } = await import('fflate');
    const readme = zipSpy.mock.calls[0]![1]!;
    const txt = strFromU8(
      unzipSync(buildZip([{ name: 'photo.jpg', bytes: new Uint8Array(10) }], readme))[
        'README.txt'
      ]!,
    );
    expect(txt.match(/photo\.jpg/g)).toHaveLength(1);
    expect(txt).toContain('Specs source: CRP PO/MT-XVI');
    expect(txt).toContain('https://www.ibps.in/notice.pdf');
    expect(txt).toContain('Specs last checked: 2026-07-01');
    expect(events.find((x) => x.e === 'kit_zip_downloaded')!.p).toEqual({
      exam: preset.slug,
      docs: 2,
      via: 'download',
    });
    clickSpy.mockRestore();
  });

  it('one-document kit: the summary downloads the file itself, not a ZIP', async () => {
    const preset = ibpsLike();
    preset.docs = preset.docs.slice(0, 1);
    await mount(preset);
    await click(button('Start with Photograph'));
    await pick([jpegFile('x.jpg')]);
    await waitFor(() => screen() === 'result', 'result');
    await click(button('Looks good — Finish'));
    expect(screen()).toBe('summary');
    expect(root.textContent).toContain('Your file is ready');
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await click(button('Download photo.jpg'));
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(events.find((x) => x.e === 'doc_downloaded')!.p).toEqual({
      exam: preset.slug,
      doc: 'photo',
      via: 'download',
    });
    clickSpy.mockRestore();
  });

  it('a #start link skips the checklist and opens the first document', async () => {
    history.replaceState(null, '', '/kit/test#start');
    await mount(ibpsLike());
    expect(screen()).toBe('upload');
    expect(root.textContent).toContain('Add your Photograph');
    expect(location.hash).toBe('');
  });

  it('one document from its own page: download is the primary action', async () => {
    const preset = ibpsLike();
    await mount(preset, { only: 'photo', showHeader: false });
    expect(screen()).toBe('upload');
    expect(root.textContent).not.toContain('All documents');
    expect(root.textContent).not.toContain('Step 1 of');
    await pick([jpegFile('x.jpg')]);
    await waitFor(() => screen() === 'result', 'result');
    expect(root.textContent).toContain('upload photo.jpg in the Photograph box');
    const primary = root.querySelector('div.sticky button') as HTMLButtonElement;
    expect(primary.textContent).toContain('Download photo.jpg');
  });

  it('a progress callback that arrives after the PDF is made does not leave the kit busy', async () => {
    configureMock({ lateProgressMs: 30 });
    const preset = ibpsLike();
    preset.docs = preset.docs.filter((d) => d.key === 'certificate');
    preset.docs[0]!.spec.minKB = null;
    await mount(preset);
    await click(button('Start with 10th certificate'));
    await pick([jpegFile('page-one.jpg')]);
    await click(button('Make PDF'));
    await waitFor(() => screen() === 'result', 'cert result');
    await act(async () => void (await new Promise((r) => setTimeout(r, 60))));
    expect(root.textContent).not.toContain('Making PDF');
    await click(button('Looks good — Finish'));
    expect(screen()).toBe('summary');
    expect(button('Download cert.pdf').disabled).toBe(false);
    expect(root.querySelector('[aria-busy="true"]')).toBeNull();
  });

  it('shows the private-mode banner when a save fails after load', async () => {
    await mount(ibpsLike());
    expect(root.textContent).not.toContain('Private mode');
    const put = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(() => {
      throw new DOMException('Blobs are not supported', 'DataCloneError');
    });
    try {
      await click(button('Start with Photograph'));
      await pick([jpegFile('x.jpg')]);
      await waitFor(() => screen() === 'result', 'result');
      await act(async () => void (await flushKit()));
      await waitFor(() => !!root.textContent?.includes('Private mode'), 'banner');
    } finally {
      put.mockRestore();
    }
  });

  it('shows the engine error in plain words with the numbers, and tracks only the code', async () => {
    configureMock({ failFit: { photo: 'TOO_DETAILED' } });
    const preset = ibpsLike();
    await mount(preset);
    await click(button('Start with Photograph'));
    await pick([jpegFile('x.jpg')]);
    // The automatic fit fails: the crop screen opens with the error and a fix button.
    await waitFor(() => root.querySelector('[role="alert"]') !== null, 'error');
    expect(root.querySelector('[role="alert"]')!.textContent).toContain('under 50 KB');
    expect(screen()).toBe('crop');
    await click(button('Use a different photo'));
    expect(screen()).toBe('upload');
    expect(events.find((x) => x.e === 'error')!.p).toEqual({
      code: 'TOO_DETAILED',
      exam: preset.slug,
      doc: 'photo',
    });
  });

  it('disables Next while a required rule fails (K7)', async () => {
    configureMock({ sizeOverride: { photo: 61 * 1024 } });
    await mount(ibpsLike());
    await click(button('Start with Photograph'));
    await pick([jpegFile('x.jpg')]);
    await waitFor(() => screen() === 'result', 'result');
    expect(button(/Looks good/).disabled).toBe(true);
    expect(root.textContent).not.toContain('Download this file');
    expect(root.textContent).toContain('Not ready yet');
    expect(root.querySelector('[data-testid="kit-fix"]')!.textContent).toContain(
      'could not be made the right size',
    );
    expect(root.textContent).toContain('61.0 KB (needs 20–50 KB)');
  });

  it('rejects a 30 MB file with the numbers before touching the engine', async () => {
    await mount(ibpsLike());
    await click(button('Start with Photograph'));
    await pick([jpegFile('big.jpg', 30 * 1024 * 1024)]);
    expect(root.textContent).toContain('File is 30.0 MB. The limit is 25 MB.');
    expect(screen()).toBe('upload');
    expect(events.find((x) => x.e === 'error')!.p.code).toBe('TOO_LARGE_INPUT');
  });

  it('live-capture exams (SSC/RRB) show the live tips instead of a photo step', async () => {
    const p = ibpsLike();
    p.photoUploadReplacedByLive = true;
    p.liveCaptureTips = [L('Camera at eye level')];
    p.docs = p.docs.filter((d) => d.key !== 'photo');
    await mount(p);
    expect(root.textContent).toContain('Photo is taken live in the form');
    expect(root.textContent).toContain('Camera at eye level');
    expect(root.querySelector('[data-doc="photo"]')).toBeNull();
  });

  it('K13: declaration upload shows the trace sheet with the name filled in', async () => {
    const p = ibpsLike();
    p.docs = [
      {
        key: 'declaration',
        spec: {
          doc: 'declaration',
          label: L('Declaration'),
          widthPx: 800,
          heightPx: 400,
          minKB: 50,
          maxKB: 100,
          format: 'jpg',
          dpi: 200,
          fileName: 'decl.jpg',
          rules: [],
        },
      },
    ];
    await mount(p);
    await click(button('Start with Declaration'));
    const input = root.querySelector('input[autocomplete="name"]') as HTMLInputElement;
    await act(async () => {
      input.value = 'Asha Verma';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(root.querySelector('blockquote')!.textContent).toBe(
      'I, Asha Verma, hereby declare that all is true.',
    );
    expect(root.textContent).toContain('Download trace sheet (PDF)');
  });

  it('dual-language signature variant shows its guidance', async () => {
    const p = ibpsLike();
    p.docs = [{ ...p.docs[1]!, key: 'signature-hindi', variant: 'dual-language' }];
    await mount(p, { only: 'signature-hindi', showHeader: false });
    expect(screen()).toBe('upload');
    expect(root.textContent).toContain('Two signatures needed');
    expect(root.querySelector('h1')).toBeNull();
    expect(root.querySelector('h2')).not.toBeNull();
  });
});
