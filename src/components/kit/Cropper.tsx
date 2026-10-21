/**
 * Canvas cropper (SPEC K4). Frame locked to `aspect` (pass `cropAspect(spec)`), the image
 * moves underneath: drag (pointer), pinch-zoom (two pointers), wheel / slider zoom,
 * rotate 90°, fine rotate ±10°, flip. Keyboard: arrows move, +/- zoom, R rotates.
 * Face oval + eye line for photos, 80% ink box for signature/thumb (CropGuides).
 *
 * `width`/`height` are the ENGINE image dims (after EXIF + 4000 px cap); `src` may be any
 * displayable rendition of the same image (object URL or engine preview), it is scaled.
 * Reports a persistable CropState on every change; convert with engineCropArgs().
 * Reusable by tool islands (F).
 */
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { FlipHorizontal2, RotateCw, RefreshCw } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { Slider } from '@/components/ui/Slider';
import type { CropState } from '@/lib/kit-store';
import type { T } from '@/lib/format';
import { drawGuides, CropGuideLegend, type GuideKind } from './CropGuides';
import {
  FINE_LIMIT,
  MAX_ZOOM,
  MIN_ZOOM,
  clampView,
  frameSize,
  rotationDeg,
  toCropState,
  viewFromState,
  type View,
} from './crop-math';

export interface CropperProps {
  t: T;
  src: string;
  width: number;
  height: number;
  aspect: number | null;
  guide: GuideKind;
  initial?: CropState;
  onChange: (state: CropState) => void;
}

const FRAME_FILL = 0.86;

export function Cropper({
  t,
  src,
  width: W,
  height: H,
  aspect,
  guide,
  initial,
  onChange,
}: CropperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [view, setViewState] = useState<View>(() =>
    clampView(W, H, viewFromState(initial), aspect),
  );
  const viewRef = useRef(view);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; mx: number; my: number } | null>(null);
  const [loaded, setLoaded] = useState(false);

  const setView = useCallback(
    (next: View | ((v: View) => View)) => {
      const v = clampView(W, H, typeof next === 'function' ? next(viewRef.current) : next, aspect);
      viewRef.current = v;
      setViewState(v);
    },
    [W, H, aspect],
  );

  // Report changes (also the initial state, so "Auto-fit" works without touching anything).
  useEffect(() => {
    onChange(toCropState(W, H, view, aspect));
  }, [view, W, H, aspect]);

  // Load the image.
  useEffect(() => {
    let alive = true;
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      if (!alive) return;
      imgRef.current = img;
      setLoaded(true);
    };
    img.src = src;
    return () => {
      alive = false;
    };
  }, [src]);

  /** Display scale (CSS px per image px) and frame box for the current stage size. */
  const layout = useCallback(
    (cw: number, ch: number, v: View) => {
      const f = frameSize(W, H, v, aspect);
      const k = Math.min((cw * FRAME_FILL) / f.w, (ch * FRAME_FILL) / f.h);
      const fw = f.w * k;
      const fh = f.h * k;
      return { k, frame: { x: (cw - fw) / 2, y: (ch - fh) / 2, w: fw, h: fh } };
    },
    [W, H, aspect],
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext?.('2d');
    if (!canvas || !ctx) return;
    const dpr = typeof devicePixelRatio === 'number' ? devicePixelRatio : 1;
    const cw = canvas.clientWidth || 320;
    const ch = canvas.clientHeight || 320;
    if (canvas.width !== Math.round(cw * dpr) || canvas.height !== Math.round(ch * dpr)) {
      canvas.width = Math.round(cw * dpr);
      canvas.height = Math.round(ch * dpr);
    }
    const v = viewRef.current;
    const { k, frame } = layout(cw, ch, v);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#1F2937';
    ctx.fillRect(0, 0, cw, ch);
    const img = imgRef.current;
    if (img) {
      ctx.save();
      ctx.translate(cw / 2 - v.panX * k, ch / 2 - v.panY * k);
      ctx.rotate((rotationDeg(v) * Math.PI) / 180);
      ctx.scale(v.flip.h ? -1 : 1, v.flip.v ? -1 : 1);
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, (-W / 2) * k, (-H / 2) * k, W * k, H * k);
      ctx.restore();
    }
    drawGuides(ctx, { w: cw, h: ch }, frame, guide);
  }, [W, H, guide, layout]);

  useEffect(() => {
    const id = typeof requestAnimationFrame === 'function' ? requestAnimationFrame(draw) : 0;
    return () => {
      if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(id);
    };
  }, [draw, view, loaded]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(el);
    return () => ro.disconnect();
  }, [draw]);

  const scaleNow = () => {
    const c = canvasRef.current;
    return layout(c?.clientWidth || 320, c?.clientHeight || 320, viewRef.current).k;
  };

  const panBy = (dxCss: number, dyCss: number) => {
    const k = scaleNow();
    setView((v) => ({ ...v, panX: v.panX - dxCss / k, panY: v.panY - dyCss / k }));
  };

  const zoomBy = (factor: number) => setView((v) => ({ ...v, zoom: v.zoom * factor }));

  const onPointerDown = (e: PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()] as [
        { x: number; y: number },
        { x: number; y: number },
      ];
      pinch.current = {
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        mx: (a.x + b.x) / 2,
        my: (a.y + b.y) / 2,
      };
    }
  };

  const onPointerMove = (e: PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size >= 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()] as [
        { x: number; y: number },
        { x: number; y: number },
      ];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const p = pinch.current;
      if (p.dist > 0) zoomBy(dist / p.dist);
      panBy(mx - p.mx, my - p.my);
      pinch.current = { dist, mx, my };
    } else if (pointers.current.size === 1) {
      panBy(e.clientX - prev.x, e.clientY - prev.y);
    }
  };

  const onPointerUp = (e: PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  };

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    zoomBy(e.deltaY < 0 ? 1.1 : 1 / 1.1);
  };

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    c.addEventListener('wheel', onWheel, { passive: false });
    return () => c.removeEventListener('wheel', onWheel);
  });

  const onKeyDown = (e: KeyboardEvent) => {
    const step = e.shiftKey ? 40 : 8;
    const map: Record<string, () => void> = {
      ArrowLeft: () => panBy(step, 0),
      ArrowRight: () => panBy(-step, 0),
      ArrowUp: () => panBy(0, step),
      ArrowDown: () => panBy(0, -step),
      '+': () => zoomBy(1.1),
      '=': () => zoomBy(1.1),
      '-': () => zoomBy(1 / 1.1),
      r: rotate90,
      R: rotate90,
    };
    const fn = map[e.key];
    if (fn) {
      e.preventDefault();
      fn();
    }
  };

  function rotate90() {
    setView((v) => {
      const rot90 = ((v.rot90 + 1) % 4) as View['rot90'];
      // rotate the pan with the image so the same area stays framed
      return { ...v, rot90, panX: -v.panY, panY: v.panX };
    });
  }

  const flip = () => setView((v) => ({ ...v, flip: { h: !v.flip.h, v: v.flip.v }, panX: -v.panX }));
  const reset = () =>
    setView({ rot90: 0, fineDeg: 0, flip: { h: false, v: false }, zoom: 1, panX: 0, panY: 0 });

  return (
    <div class="space-y-3">
      <div
        ref={wrapRef}
        class="relative h-[min(56vh,420px)] w-full overflow-hidden rounded-card bg-[#1F2937]"
      >
        <canvas
          ref={canvasRef}
          class="block h-full w-full cursor-move touch-none"
          tabIndex={0}
          role="img"
          aria-label={t('kit.crop.canvasLabel')}
          aria-describedby="cropper-help"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={onKeyDown}
        />
        {!loaded && (
          <div class="absolute inset-0 flex items-center justify-center text-sm text-white">
            {t('common.loading')}
          </div>
        )}
      </div>
      <div id="cropper-help">
        <CropGuideLegend t={t} kind={guide} />
      </div>
      <Slider
        label={t('kit.crop.zoom')}
        min={MIN_ZOOM}
        max={MAX_ZOOM}
        step={0.05}
        value={view.zoom}
        valueText={`${view.zoom.toFixed(1)}×`}
        onInput={(z) => setView((v) => ({ ...v, zoom: z }))}
      />
      <Slider
        label={t('kit.crop.fineRotate')}
        min={-FINE_LIMIT}
        max={FINE_LIMIT}
        step={0.5}
        value={view.fineDeg}
        valueText={`${view.fineDeg > 0 ? '+' : ''}${view.fineDeg}°`}
        onInput={(d) => setView((v) => ({ ...v, fineDeg: d }))}
      />
      <div class="grid grid-cols-3 gap-2">
        <Button onClick={rotate90} aria-label={t('kit.crop.rotate')}>
          <RotateCw size={20} aria-hidden="true" />
          <span class="text-sm">90°</span>
        </Button>
        <Button onClick={flip} aria-pressed={view.flip.h} aria-label={t('kit.crop.flip')}>
          <FlipHorizontal2 size={20} aria-hidden="true" />
          <span class="text-sm">{t('kit.crop.flipShort')}</span>
        </Button>
        <Button onClick={reset} aria-label={t('kit.crop.reset')}>
          <RefreshCw size={20} aria-hidden="true" />
          <span class="text-sm">{t('kit.crop.resetShort')}</span>
        </Button>
      </div>
    </div>
  );
}
