import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { createT } from '@/i18n/core';
import { getNamespace } from '@/i18n';
import { Uploader, acceptAttr, uploadErrorText, validateFile } from '@/components/kit/Uploader';

vi.mock('@/engine/api', () => import('@/engine/mock'));

const t = createT(getNamespace('en', 'common', 'ui'));
const tHi = createT(getNamespace('hi', 'common', 'ui'));

function fileOfSize(name: string, type: string, size: number): File {
  const f = new File([new Uint8Array(8)], name, { type });
  Object.defineProperty(f, 'size', { value: size });
  return f;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('Uploader (K3, 5.3)', () => {
  it('accept list covers JPG, PNG, WebP, HEIC/HEIF and PDF', () => {
    const a = acceptAttr(true);
    for (const x of [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/heic',
      'image/heif',
      '.heic',
      'application/pdf',
      '.pdf',
    ])
      expect(a).toContain(x);
    expect(acceptAttr(false)).not.toContain('pdf');
  });

  it('rejects files over 25 MB with the numbers', () => {
    const err = validateFile(fileOfSize('big.jpg', 'image/jpeg', 31.2 * 1024 * 1024));
    expect(err?.code).toBe('TOO_LARGE_INPUT');
    expect(t(`common.errors.${err!.code}`, err!.details)).toBe(
      'File is 31.2 MB. The limit is 25 MB.',
    );
  });

  it('accepts HEIC by extension when the browser gives no MIME type', () => {
    expect(validateFile(fileOfSize('IMG_1.HEIC', '', 2e6))).toBeNull();
    expect(validateFile(fileOfSize('a.gif', 'image/gif', 1000))?.code).toBe('UNSUPPORTED_TYPE');
    expect(validateFile(fileOfSize('a.pdf', 'application/pdf', 1000), false)?.code).toBe(
      'UNSUPPORTED_TYPE',
    );
  });

  it('shows the trust line, camera + gallery buttons, and reports picked files', async () => {
    const onFiles = vi.fn();
    const onReject = vi.fn();
    const root = document.createElement('div');
    document.body.appendChild(root);
    act(() => render(<Uploader t={t} onFiles={onFiles} onReject={onReject} />, root));
    expect(root.textContent).toContain('Processed on your device. Never uploaded.');
    expect(root.textContent).toContain('Take photo');
    expect(root.textContent).toContain('Choose from gallery');
    const cam = root.querySelector('input[capture]') as HTMLInputElement;
    expect(cam.getAttribute('capture')).toBe('environment');

    const input = root.querySelector('[data-testid="gallery-input"]') as HTMLInputElement;
    const good = fileOfSize('me.jpg', 'image/jpeg', 1000);
    Object.defineProperty(input, 'files', { value: [good], configurable: true });
    act(() => {
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(onFiles).toHaveBeenCalledWith([good]);

    const big = fileOfSize('big.jpg', 'image/jpeg', 30 * 1024 * 1024);
    Object.defineProperty(input, 'files', { value: [big], configurable: true });
    act(() => {
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(onReject).toHaveBeenCalledWith(expect.objectContaining({ code: 'TOO_LARGE_INPUT' }));
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('The limit is 25 MB');
    render(null, root);
  });

  it("accept='pdf' narrows the picker, the hint and validation (T7)", async () => {
    expect(acceptAttr('pdf').split(',').sort()).toEqual(['.pdf', 'application/pdf']);
    expect(validateFile(fileOfSize('a.jpg', 'image/jpeg', 1000), 'pdf')?.code).toBe('UNSUPPORTED_TYPE');
    expect(validateFile(fileOfSize('a.pdf', 'application/pdf', 1000), 'pdf')).toBeNull();
    expect(validateFile(fileOfSize('a.jpg', 'image/jpeg', 1000), 'image')).toBeNull();

    const onFiles = vi.fn();
    const onReject = vi.fn();
    const root = document.createElement('div');
    document.body.appendChild(root);
    // accept wins over allowPdf, and hides the camera button
    act(() => render(<Uploader t={t} accept="pdf" allowPdf={false} onFiles={onFiles} onReject={onReject} />, root));
    const input = root.querySelector('[data-testid="gallery-input"]') as HTMLInputElement;
    expect(input.getAttribute('accept')).toBe(acceptAttr('pdf'));
    expect(root.textContent).toContain('PDF only, up to 25 MB');
    expect(root.textContent).not.toContain('Take photo');
    const pick = async (f: File) => {
      Object.defineProperty(input, 'files', { value: [f], configurable: true });
      await act(async () => void input.dispatchEvent(new Event('change', { bubbles: true })));
    };
    await pick(fileOfSize('photo.jpg', 'image/jpeg', 1000));
    expect(onFiles).not.toHaveBeenCalled();
    expect(onReject).toHaveBeenCalledWith(expect.objectContaining({ code: 'UNSUPPORTED_TYPE' }));
    expect(root.querySelector('[role="alert"]')?.textContent).toBe('This is not a PDF. Choose a PDF file.');
    await pick(fileOfSize('doc.pdf', 'application/pdf', 1000));
    expect(onFiles).toHaveBeenCalledTimes(1);
    render(null, root);
  });

  it('unsupported-type message names only what is accepted (image / pdf / image+pdf, en + hi)', async () => {
    const err = { code: 'UNSUPPORTED_TYPE' as const, details: { type: 'image/gif' } };
    const img = uploadErrorText(t, err, 'image');
    expect(img).toContain('HEIC');
    expect(img).not.toContain('PDF');
    expect(uploadErrorText(t, err, 'pdf')).toBe('This is not a PDF. Choose a PDF file.');
    expect(uploadErrorText(t, err, 'image+pdf')).toMatch(/HEIC or PDF/);
    const imgHi = uploadErrorText(tHi, err, 'image');
    expect(imgHi).toContain('HEIC');
    expect(imgHi).not.toContain('PDF');
    expect(uploadErrorText(tHi, err, 'pdf')).toContain('PDF');
    expect(uploadErrorText(tHi, err, 'image+pdf')).toContain('PDF');
    expect(uploadErrorText(tHi, err, 'image+pdf')).not.toBe(uploadErrorText(t, err, 'image+pdf'));

    // Rendered: an image-only Uploader rejecting a GIF does not mention PDF.
    const root = document.createElement('div');
    document.body.appendChild(root);
    act(() => render(<Uploader t={t} allowPdf={false} onFiles={vi.fn()} />, root));
    const input = root.querySelector('[data-testid="gallery-input"]') as HTMLInputElement;
    Object.defineProperty(input, 'files', { value: [fileOfSize('a.gif', 'image/gif', 1000)], configurable: true });
    await act(async () => void input.dispatchEvent(new Event('change', { bubbles: true })));
    const alert = root.querySelector('[role="alert"]')?.textContent ?? '';
    expect(alert).toContain('not supported');
    expect(alert).not.toContain('PDF');
    render(null, root);
  });
});
