/**
 * Before/after preview at real size (1 image px = 1 CSS px) and zoomed (SPEC 6.4).
 * Sizes are HTML attributes, not inline styles (CSP). Reusable by tool islands (F).
 */
import { useState } from 'preact/hooks';
import type { T } from '@/lib/format';
import { useObjectUrl } from './useObjectUrl';

interface Props {
  t: T;
  after: Blob;
  width: number;
  height: number;
  /** Original upload, shown small for comparison. */
  before?: Blob | null;
  alt: string;
}

export function ResultPreview({ t, after, width, height, before, alt }: Props) {
  const [mode, setMode] = useState<'zoomed' | 'real'>('zoomed');
  const afterUrl = useObjectUrl(after);
  const beforeUrl = useObjectUrl(before ?? null);
  const tab = (m: 'zoomed' | 'real', label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={mode === m}
      onClick={() => setMode(m)}
      class={`min-h-tap flex-1 rounded-card px-3 text-sm font-semibold ${
        mode === m ? 'bg-primary text-on-primary' : 'bg-surface text-text'
      }`}
    >
      {label}
    </button>
  );
  return (
    <div class="card space-y-3 p-4">
      <div
        role="tablist"
        aria-label={t('ui.preview.view')}
        class="flex gap-2 rounded-card border border-border p-1"
      >
        {tab('zoomed', t('ui.preview.zoomed'))}
        {tab('real', t('ui.preview.realSize'))}
      </div>
      <div class="flex min-h-[160px] items-center justify-center overflow-auto rounded-card bg-[repeating-conic-gradient(#E2E8F0_0_25%,#FFFFFF_0_50%)] bg-[length:16px_16px] p-3">
        {afterUrl &&
          (mode === 'real' ? (
            <img src={afterUrl} width={width} height={height} alt={alt} class="max-w-none" />
          ) : (
            <img
              src={afterUrl}
              width={width}
              height={height}
              alt={alt}
              class="h-auto max-h-[50vh] w-full max-w-xs object-contain"
            />
          ))}
      </div>
      {beforeUrl && (
        <details class="text-sm">
          <summary class="min-h-tap cursor-pointer py-3 font-semibold text-primary">
            {t('ui.preview.before')}
          </summary>
          <img
            src={beforeUrl}
            alt={t('ui.preview.beforeAlt')}
            class="mx-auto h-auto max-h-48 w-auto"
          />
        </details>
      )}
    </div>
  );
}
