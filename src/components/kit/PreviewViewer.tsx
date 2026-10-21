/**
 * Full-screen result viewer (opened from ResultPreview). A viewer, not a confirmation modal:
 *  - Fullscreen API on the viewer element where available; where it is missing (iOS Safari)
 *    the same element is a fixed overlay over the whole viewport.
 *  - Esc, the close button and the browser Back button close it (a history entry is pushed
 *    while it is open; popstate closes it).
 *  - Focus moves to the close button on open, stays inside while open, and returns to the
 *    opener on close.
 *  - Pinch-to-zoom and pan with pointer events, double-tap / double-click to zoom, wheel zoom.
 * Sizes and the zoom transform are set through the CSSOM (CSP forbids SSR style attributes;
 * this component only renders on the client after a click).
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import { Download, X } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { formatKB, pxText, type T } from '@/lib/format';

interface Props {
  t: T;
  afterUrl: string;
  beforeUrl: string | null;
  width: number;
  height: number;
  alt: string;
  sizeBytes?: number;
  onDownload?: () => void;
  onClose: () => void;
  /** Element that gets focus back on close (the "Full screen" button). */
  returnFocus?: HTMLElement | null;
}

const MAX_ZOOM = 6;
const STATE_KEY = 'sahisizeViewer';

export function PreviewViewer({
  t,
  afterUrl,
  beforeUrl,
  width,
  height,
  alt,
  sizeBytes,
  onDownload,
  onClose,
  returnFocus,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const requestClose = useRef<() => void>(() => onClose());
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [show, setShow] = useState<'after' | 'before'>('after');
  const view = useRef({ s: 1, x: 0, y: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ d: number; s: number } | null>(null);

  const apply = () => {
    const img = imgRef.current;
    if (!img) return;
    const { s, x, y } = view.current;
    img.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${s})`;
  };
  const resetZoom = () => {
    view.current = { s: 1, x: 0, y: 0 };
    apply();
  };
  const zoomTo = (s: number) => {
    view.current.s = Math.min(MAX_ZOOM, Math.max(1, s));
    if (view.current.s === 1) view.current = { s: 1, x: 0, y: 0 };
    apply();
  };

  /** Fit the image into the stage (upscaling small exam photos so they fill the screen). */
  const fit = () => {
    const img = imgRef.current;
    const stage = stageRef.current;
    if (!img || !stage) return;
    const w = img.naturalWidth || width;
    const h = img.naturalHeight || height;
    const k = Math.min(stage.clientWidth / w, stage.clientHeight / h, 8);
    img.style.width = `${Math.max(1, Math.floor(w * k))}px`;
    img.style.height = `${Math.max(1, Math.floor(h * k))}px`;
  };

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let pushed = false;
    let done = false;
    try {
      history.pushState({ [STATE_KEY]: true }, '');
      pushed = true;
    } catch {
      /* sandboxed: no history entry, Esc and X still close */
    }
    const finish = () => {
      if (done) return;
      done = true;
      onCloseRef.current();
    };
    requestClose.current = () => {
      if (pushed && (history.state as Record<string, unknown> | null)?.[STATE_KEY]) history.back();
      else finish();
    };
    const onPop = () => {
      pushed = false;
      finish();
    };
    const onFsChange = () => {
      // Esc inside real fullscreen exits fullscreen first; close the viewer with it.
      if (!document.fullscreenElement) requestClose.current();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        requestClose.current();
      } else if (e.key === 'Tab') {
        const items = Array.from(
          root.querySelectorAll<HTMLElement>('button:not([disabled]), [tabindex="0"]'),
        );
        if (!items.length) return;
        const first = items[0]!;
        const last = items[items.length - 1]!;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        } else if (!root.contains(document.activeElement)) {
          e.preventDefault();
          first.focus();
        }
      } else if (e.key === '+' || e.key === '=') zoomTo(view.current.s * 1.25);
      else if (e.key === '-') zoomTo(view.current.s / 1.25);
      else if (e.key === '0') resetZoom();
    };
    window.addEventListener('popstate', onPop);
    document.addEventListener('keydown', onKey);
    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    html.style.overflow = 'hidden';
    if (typeof root.requestFullscreen === 'function' && document.fullscreenEnabled !== false) {
      root
        .requestFullscreen()
        .then(() => document.addEventListener('fullscreenchange', onFsChange))
        .catch(() => {
          /* refused: the fixed overlay already covers the viewport */
        });
    }
    const onResize = () => fit();
    window.addEventListener('resize', onResize);
    closeRef.current?.focus();
    return () => {
      window.removeEventListener('popstate', onPop);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('fullscreenchange', onFsChange);
      window.removeEventListener('resize', onResize);
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
      html.style.overflow = prevOverflow;
      returnFocus?.focus?.();
    };
  }, []);

  useEffect(() => {
    resetZoom();
    fit();
  }, [show]);

  const dist = () => {
    const [a, b] = Array.from(pointers.current.values());
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  };

  const onPointerDown = (e: PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) pinch.current = { d: dist() || 1, s: view.current.s };
  };
  const onPointerMove = (e: PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size >= 2 && pinch.current) {
      zoomTo((pinch.current.s * dist()) / pinch.current.d);
    } else if (pointers.current.size === 1 && view.current.s > 1) {
      view.current.x += e.clientX - prev.x;
      view.current.y += e.clientY - prev.y;
      apply();
    }
  };
  const onPointerUp = (e: PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  };

  const tab = (v: 'after' | 'before', label: string) => (
    <button
      type="button"
      aria-pressed={show === v}
      onClick={() => setShow(v)}
      class={`min-h-tap rounded-lg px-4 text-sm font-semibold ${
        show === v ? 'bg-on-scrim text-scrim' : 'text-on-scrim hover:bg-on-scrim/10'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={t('ui.preview.fullscreenTitle')}
      data-testid="preview-viewer"
      class="fixed inset-0 z-[70] flex flex-col bg-scrim text-on-scrim"
    >
      <div class="flex flex-wrap items-center gap-2 px-[max(0.75rem,env(safe-area-inset-left))] pb-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
        {beforeUrl && (
          <div class="flex gap-1 rounded-xl border border-on-scrim/30 p-1">
            {tab('before', t('ui.preview.beforeShort'))}
            {tab('after', t('ui.preview.after'))}
          </div>
        )}
        <p class="min-w-0 flex-1 text-sm font-semibold tabular-nums" data-testid="viewer-meta">
          {sizeBytes !== undefined && <span>{formatKB(sizeBytes)} · </span>}
          {pxText(t, width, height)}
        </p>
        <button
          ref={closeRef}
          type="button"
          onClick={() => requestClose.current()}
          aria-label={t('common.actions.close')}
          title={t('common.actions.close')}
          class="inline-flex h-tap w-tap shrink-0 items-center justify-center rounded-full bg-on-scrim/10 hover:bg-on-scrim/20"
        >
          <X size={24} aria-hidden="true" />
        </button>
      </div>
      <div
        ref={stageRef}
        class="relative mx-3 flex min-h-0 flex-1 touch-none select-none items-center justify-center overflow-hidden"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDblClick={() => (view.current.s > 1 ? resetZoom() : zoomTo(2.5))}
        onWheel={(e) => {
          e.preventDefault();
          zoomTo(view.current.s * Math.exp(-e.deltaY * 0.0015));
        }}
      >
        <img
          ref={imgRef}
          src={show === 'after' || !beforeUrl ? afterUrl : beforeUrl}
          alt={show === 'after' || !beforeUrl ? alt : t('ui.preview.beforeAlt')}
          width={width}
          height={height}
          draggable={false}
          onLoad={fit}
          class="max-w-none origin-center bg-sheet shadow-lift"
        />
      </div>
      <div class="space-y-2 px-[max(0.75rem,env(safe-area-inset-left))] pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
        <p class="text-center text-xs text-on-scrim/80">{t('ui.preview.zoomHint')}</p>
        {onDownload && (
          <div class="flex justify-center">
            <Button
              variant="primary"
              class="min-h-[56px] w-full text-lg sm:w-auto sm:min-w-[280px]"
              onClick={onDownload}
            >
              <Download size={22} aria-hidden="true" />
              {t('common.actions.download')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
