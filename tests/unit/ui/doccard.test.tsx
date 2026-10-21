import { describe, expect, it } from 'vitest';
import { render } from 'preact';
import { getNamespace } from '@/i18n';
import { createT } from '@/i18n/core';
import { DocCard } from '@/components/kit/DocCard';

describe('DocCard', () => {
  it('optional docs read "(label) (only if it applies)" with a real space', () => {
    const t = createT(getNamespace('en', 'common', 'ui', 'kit'));
    const root = document.createElement('div');
    render(
      <DocCard
        t={t}
        lang="en"
        status="todo"
        onOpen={() => {}}
        doc={{
          key: 'certificate',
          optional: true,
          spec: {
            doc: 'certificate',
            label: { en: 'SC/ST certificate (free travel pass)', hi: 'x' },
            widthPx: null,
            heightPx: null,
            minKB: null,
            maxKB: 400,
            format: 'pdf',
            dpi: null,
            fileName: 'cert.pdf',
            rules: [],
          },
        }}
      />,
      root,
    );
    expect(root.textContent).toContain('(free travel pass) (only if it applies)');
  });
});
