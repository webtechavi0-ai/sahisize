import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { createT } from '@/i18n/core';
import { getNamespace } from '@/i18n';
import { Uploader, acceptAttr, validateFile } from '@/components/kit/Uploader';

vi.mock('@/engine/api', () => import('@/engine/mock'));

const t = createT(getNamespace('en', 'common', 'ui'));

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
});
