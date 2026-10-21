/**
 * Crop overlays (SPEC K4), drawn on the Cropper canvas (no inline styles, CSP-safe):
 *  - 'face': oval for the head and a horizontal eye line (passport framing).
 *  - 'ink': dashed inner box at 80% of the frame: ink should fill it (signature/thumb/
 *    declaration). Matches the engine's >= 80% ink-fill target (SPEC 7.4).
 * Also exports a small legend component describing the active guide.
 */
import type { DocType } from '@/engine/types';
import type { T } from '@/lib/format';

export type GuideKind = 'face' | 'ink' | 'none';

export function guideFor(doc: DocType): GuideKind {
  if (doc === 'photo') return 'face';
  if (doc === 'signature' || doc === 'thumb' || doc === 'declaration') return 'ink';
  return 'none';
}

export interface FrameBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Inner ink box: 80% of the frame, centred. */
export function inkBox(f: FrameBox): FrameBox {
  return { x: f.x + f.w * 0.1, y: f.y + f.h * 0.1, w: f.w * 0.8, h: f.h * 0.8 };
}

/** Face oval (centre, radii) and eye-line y for a passport frame. */
export function faceGuide(f: FrameBox): {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  eyeY: number;
} {
  return {
    cx: f.x + f.w / 2,
    cy: f.y + f.h * 0.44,
    rx: f.w * 0.3,
    ry: f.h * 0.3,
    eyeY: f.y + f.h * 0.4,
  };
}

/** Dim outside the frame, outline it, then draw the guide. */
export function drawGuides(
  ctx: CanvasRenderingContext2D,
  stage: { w: number; h: number },
  f: FrameBox,
  kind: GuideKind,
  dpr = 1,
): void {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.beginPath();
  ctx.rect(0, 0, stage.w, stage.h);
  ctx.rect(f.x, f.y, f.w, f.h);
  ctx.fill('evenodd');

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2 * dpr;
  ctx.setLineDash([]);
  ctx.strokeRect(f.x, f.y, f.w, f.h);

  ctx.lineWidth = 2 * dpr;
  ctx.setLineDash([8 * dpr, 6 * dpr]);
  if (kind === 'face') {
    const g = faceGuide(f);
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath();
    ctx.ellipse(g.cx, g.cy, g.rx, g.ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(251,191,36,0.95)'; // saffron eye line
    ctx.beginPath();
    ctx.moveTo(g.cx - g.rx * 1.15, g.eyeY);
    ctx.lineTo(g.cx + g.rx * 1.15, g.eyeY);
    ctx.stroke();
  } else if (kind === 'ink') {
    const b = inkBox(f);
    ctx.strokeStyle = 'rgba(251,191,36,0.95)';
    ctx.strokeRect(b.x, b.y, b.w, b.h);
  }
  ctx.restore();
}

/** Text explanation of the guide, shown under the canvas. */
export function CropGuideLegend({ t, kind }: { t: T; kind: GuideKind }) {
  const key =
    kind === 'face'
      ? 'kit.crop.hintPhoto'
      : kind === 'ink'
        ? 'kit.crop.hintInk'
        : 'kit.crop.hintFree';
  return <p class="text-sm text-muted">{t(key)}</p>;
}
