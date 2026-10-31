'use client';
/**
 * Before/after preview at real size (1 image px = 1 CSS px) and zoomed (SPEC 6.4), plus a
 * full-screen viewer. Sizes are HTML attributes, not inline styles (CSP); the viewer's
 * pinch-zoom transform is set through the CSSOM at runtime, which CSP allows.
 * Reusable by tool islands (F).
 */
import { useRef, useState } from 'react';
import { Maximize2 } from '@/components/ui/Icon';
import type { T } from '@/lib/format';
import { useObjectUrl } from './useObjectUrl';
import { PreviewViewer } from './PreviewViewer';

interface Props {
  t: T;
  after: Blob;
  width: number;
  height: number;
  /** Original upload, shown small for comparison. */
  before?: Blob | null;
  alt: string;
  /** Final size, shown in the full-screen viewer. */
  sizeBytes?: number;
  /** The caller's existing download handler; the viewer shows a Download button when set. */
  onDownload?: () => void;
  /** Shorter zoomed preview (about a third of the screen) so the verdict and actions fit. */
  compact?: boolean;
}

/** Checkerboard "sheet" behind previews: same in both themes so dark ink stays visible. */
const SHEET =
  'bg-sheet bg-[repeating-conic-gradient(rgb(var(--sheet-check))_0_25%,rgb(var(--sheet))_0_50%)] bg-[length:16px_16px]';

export function ResultPreview({
  t,
  after,
  width,
  height,
  before,
  alt,
  sizeBytes,
  onDownload,
  compact = false,
}: Props) {
  const [mode, setMode] = useState<'zoomed' | 'real'>('zoomed');
  const [full, setFull] = useState(false);
  const fullBtn = useRef<HTMLButtonElement>(null);
  const afterUrl = useObjectUrl(after);
  const beforeUrl = useObjectUrl(before ?? null);
  const tab = (m: 'zoomed' | 'real', label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={mode === m}
      onClick={() => setMode(m)}
      className={`min-h-tap flex-1 rounded-lg px-3 text-sm font-semibold transition-colors duration-150 ${
        mode === m ? 'bg-ink text-on-ink' : 'bg-card text-text hover:bg-saffron-soft'
      }`}
    >
      {label}
    </button>
  );
  return (
    <div className="card space-y-3 p-4">
      <div className="flex gap-2">
        <div
          role="tablist"
          aria-label={t('ui.preview.view')}
          className="flex min-w-0 flex-1 gap-1 rounded-xl border border-rule p-1"
        >
          {tab('zoomed', t('ui.preview.zoomed'))}
          {tab('real', t('ui.preview.realSize'))}
        </div>
        <button
          type="button"
          ref={fullBtn}
          data-testid="preview-fullscreen"
          onClick={() => setFull(true)}
          disabled={!afterUrl}
          aria-label={t('ui.preview.fullscreen')}
          title={t('ui.preview.fullscreen')}
          className="inline-flex min-h-tap min-w-tap shrink-0 items-center justify-center gap-2 rounded-xl border border-rule-strong bg-card px-3 text-sm font-semibold text-ink shadow-btn transition duration-150 hover:-translate-y-px hover:border-ink motion-reduce:transition-none motion-reduce:hover:translate-y-0 disabled:opacity-50"
        >
          <Maximize2 size={18} aria-hidden="true" />
          <span className="hidden sm:inline">{t('ui.preview.fullscreen')}</span>
        </button>
      </div>
      <div
        className={`flex items-center justify-center overflow-auto rounded-xl p-3 ${
          compact ? 'min-h-[120px]' : 'min-h-[160px] sm:min-h-[240px] lg:min-h-[280px]'
        } ${SHEET}`}
      >
        {afterUrl &&
          (mode === 'real' ? (
            <img src={afterUrl} width={width} height={height} alt={alt} className="max-w-none" />
          ) : (
            <img
              src={afterUrl}
              width={width}
              height={height}
              alt={alt}
              className={`h-auto w-full max-w-xs object-contain sm:max-w-sm ${
                compact ? 'max-h-[30vh]' : 'max-h-[50vh]'
              }`}
            />
          ))}
      </div>
      {beforeUrl && (
        <details className="text-sm">
          <summary className="min-h-tap cursor-pointer py-3 font-semibold text-ink">
            {t('ui.preview.before')}
          </summary>
          <img
            src={beforeUrl}
            alt={t('ui.preview.beforeAlt')}
            className="mx-auto h-auto max-h-48 w-auto"
          />
        </details>
      )}
      {full && afterUrl && (
        <PreviewViewer
          t={t}
          afterUrl={afterUrl}
          beforeUrl={beforeUrl}
          width={width}
          height={height}
          alt={alt}
          sizeBytes={sizeBytes}
          onDownload={onDownload}
          onClose={() => setFull(false)}
          returnFocus={fullBtn.current}
        />
      )}
    </div>
  );
}
