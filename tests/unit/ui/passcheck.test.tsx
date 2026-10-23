import { afterEach, describe, expect, it } from 'vitest';
import { render } from 'preact';
import type { FitCheck } from '@/engine/types';
import { createT } from '@/i18n/core';
import { getNamespace } from '@/i18n';
import { PassCheck, canDownload, failedRequired, passSummary } from '@/components/kit/PassCheck';
import { KbMeter } from '@/components/kit/KbMeter';

const t = createT(getNamespace('en', 'common', 'ui', 'kit'));

const ok: FitCheck[] = [
  { rule: 'dims', pass: true, actual: '200×230 px', required: '200×230 px', level: 'required' },
  { rule: 'size', pass: true, actual: '34.2 KB', required: '20–50 KB' },
  { rule: 'size1000', pass: false, actual: '35.0 KB', required: '20–50 KB', level: 'warning' },
  { rule: 'background', pass: true, actual: 'n/a', required: 'n/a', level: 'info' },
];

let root: HTMLElement;
afterEach(() => {
  if (root) render(null, root);
  document.body.innerHTML = '';
});
function mount(vnode: preact.ComponentChild) {
  root = document.createElement('div');
  document.body.appendChild(root);
  render(vnode, root);
  return root;
}

describe('PassCheck (K7)', () => {
  it('download allowed when only warnings/info fail', () => {
    expect(canDownload(ok)).toBe(true);
    expect(failedRequired(ok)).toEqual([]);
    expect(passSummary(t, ok)).toMatch(/All checks passed/);
  });

  it('download disabled while any required rule fails; rows show actual vs required', () => {
    const bad = ok.map((c) => (c.rule === 'size' ? { ...c, pass: false, actual: '61.0 KB' } : c));
    expect(canDownload(bad)).toBe(false);
    expect(canDownload([])).toBe(false);
    const el = mount(<PassCheck t={t} checks={bad} />);
    const row = el.querySelector('[data-rule="size"]')!;
    expect(row.textContent).toContain('File size');
    expect(row.textContent).toContain('61.0 KB (needs 20–50 KB)');
    expect(el.textContent).toContain('Fail');
    expect(passSummary(t, bad)).toContain('1');
  });

  it('renders one row per rule, hiding info (n/a) rows', () => {
    const el = mount(<PassCheck t={t} checks={ok} />);
    expect(el.querySelectorAll('li[data-rule]').length).toBe(3);
    expect(el.querySelector('[data-rule="background"]')).toBeNull();
    expect(el.textContent).not.toContain('n/a');
  });

  it('uses plain labels: Format, File type (standard JPG), Print resolution only when required', () => {
    const jpg: FitCheck[] = [
      { rule: 'format', pass: true, actual: 'JPG', required: 'JPG', level: 'required' },
      { rule: 'baseline', pass: true, actual: 'Baseline', required: 'Baseline', level: 'required' },
      { rule: 'dpi', pass: true, actual: 'not set', required: 'any', level: 'info' },
    ];
    let el = mount(<PassCheck t={t} checks={jpg} />);
    expect(el.querySelector('[data-rule="format"]')!.textContent).toBe('Pass:Format: JPG');
    expect(el.querySelector('[data-rule="baseline"]')!.textContent).toContain(
      'File type: standard JPG (works on all forms)',
    );
    expect(el.querySelector('[data-rule="dpi"]')).toBeNull();
    expect(el.textContent).not.toMatch(/DPI not set|JPEG type|Baseline/);
    render(null, root);

    const withDpi: FitCheck[] = [
      ...jpg.slice(0, 1),
      { rule: 'baseline', pass: false, actual: 'Progressive', required: 'Baseline', level: 'required' },
      { rule: 'dpi', pass: true, actual: '200 DPI', required: '200 DPI', level: 'required' },
    ];
    el = mount(<PassCheck t={t} checks={withDpi} />);
    expect(el.querySelector('[data-rule="dpi"]')!.textContent).toContain('Print resolution: 200 DPI');
    expect(el.querySelector('[data-rule="baseline"]')!.textContent).toContain(
      '(needs standard JPG (works on all forms))',
    );
    // Logic unchanged: a failing required baseline still blocks download.
    expect(canDownload(withDpi)).toBe(false);
  });
});

describe('KbMeter', () => {
  it('shows size, px and in-range text', () => {
    const el = mount(
      <KbMeter t={t} sizeBytes={35 * 1024} minKB={20} maxKB={50} widthPx={200} heightPx={230} />,
    );
    expect(el.textContent).toContain('35 KB');
    expect(el.textContent).toContain('200×230 px');
    expect(el.textContent).toContain('Inside the allowed size: 20–50 KB');
  });
  it('flags out-of-range sizes', () => {
    const el = mount(<KbMeter t={t} sizeBytes={61 * 1024} minKB={20} maxKB={50} />);
    expect(el.textContent).toContain('Outside the allowed size');
  });
});
