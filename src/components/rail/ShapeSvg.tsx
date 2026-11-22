/**
 * Decorative shape drawings for the side rail (inner-pages spec §3.1, §5.1). Static SVG, all
 * aria-hidden: the text under each drawing carries the numbers.
 */
import { ICON_PATHS } from '@/components/site/Icon';
import type { DocType } from '@/lib/presets';
import { SHAPE_STAGE, TILE_STAGE, fitBox, type DocShape } from './scale-box';


/** Head-and-shoulders glyph (24 grid) for photos. */
const PERSON = ['M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M4 21a8 8 0 0 1 16 0'];

function glyphPaths(doc: DocType): readonly string[] {
  if (doc === 'photo') return PERSON;
  if (doc === 'signature') return ICON_PATHS.pen;
  return ICON_PATHS.file;
}

function Glyph({ paths, cx, cy, size }: { paths: readonly string[]; cx: number; cy: number; size: number }) {
  return (
    <svg x={cx - size / 2} y={cy - size / 2} width={size} height={size} viewBox="0 0 24 24" overflow="visible">
      <g fill="none" className="stroke-ink" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        {paths.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
    </svg>
  );
}

/** PDF page with a folded corner, w×h at (x, y). */
function PdfPage({ x, y, w, h, fold, label, fontSize }: { x: number; y: number; w: number; h: number; fold: number; label: string; fontSize: number }) {
  return (
    <g>
      <path
        d={`M${x} ${y} h${w - fold} l${fold} ${fold} v${h - fold} h${-w} z`}
        className="fill-card stroke-rule-strong"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <path d={`M${x + w - fold} ${y} v${fold} h${fold}`} fill="none" className="stroke-rule-strong" strokeWidth={1.5} strokeLinejoin="round" />
      <text
        x={x + w / 2}
        y={y + h / 2 + fold / 2 + fontSize / 3}
        textAnchor="middle"
        className="fill-muted font-bold"
        style={{ fontSize }}
      >
        {label}
      </text>
    </g>
  );
}

/** Dashed neutral box for a KB-only image (no pixel rule): w×h at (x, y), format inside. */
function KbBox({ x, y, w, h, label, fontSize }: { x: number; y: number; w: number; h: number; label: string; fontSize: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={3} className="fill-band stroke-rule-strong" strokeWidth={1.5} strokeDasharray="4 3" />
      <text x={x + w / 2} y={y + h / 2 + fontSize / 3} textAnchor="middle" className="fill-muted font-bold" style={{ fontSize }}>
        {label}
      </text>
    </g>
  );
}

export type TileShape = DocShape['kind'] | 'live';

/** 72×52 tile drawing. */
export function TileSvg({ shape, doc, format }: { shape: DocShape | { kind: 'live'; px: null }; doc: DocType; format: string }) {
  const { w: SW, h: SH } = TILE_STAGE;
  let body;
  if (shape.kind === 'live') {
    body = (
      <>
        <circle cx={SW / 2} cy={SH / 2} r={SH / 2 - 1} className="fill-ink-soft stroke-ink" strokeWidth={2} />
        <Glyph paths={ICON_PATHS.camera} cx={SW / 2} cy={SH / 2} size={22} />
      </>
    );
  } else if (shape.kind === 'pdf') {
    body = <PdfPage x={16} y={0.75} w={40} h={51} fold={10} label="PDF" fontSize={11} />;
  } else if (shape.kind === 'kb' || !shape.px) {
    body = <KbBox x={14} y={0.75} w={44} h={51} label={format.toUpperCase()} fontSize={11} />;
  } else {
    const b = fitBox(shape.px.w, shape.px.h, TILE_STAGE);
    // Inset by half the stroke so the 2 px outline stays inside the stage.
    body = (
      <>
        <rect
          x={b.x + 1}
          y={b.y + 1}
          width={b.w - 2}
          height={b.h - 2}
          rx={3}
          className="fill-card stroke-ink"
          strokeWidth={2}
          strokeDasharray={shape.kind === 'range' ? '4 3' : undefined}
          data-box={`${b.w}x${b.h}`}
        />
        {b.h >= 28 && <Glyph paths={glyphPaths(doc)} cx={b.x + b.w / 2} cy={b.y + b.h / 2} size={16} />}
      </>
    );
  }
  return (
    <svg aria-hidden="true" focusable="false" width={SW} height={SH} viewBox={`0 0 ${SW} ${SH}`} className="shrink-0 overflow-visible">
      {body}
    </svg>
  );
}

/**
 * Large shape drawing for a document page: 240×168 canvas, 160×120 stage at (24, 36), with
 * width/height dimension marks for pixel rules.
 */
export function ShapeSvg({ shape, doc, format, labels }: { shape: DocShape; doc: DocType; format: string; labels: { w: string; h: string } | null }) {
  const OX = 24;
  const OY = 36;
  let body;
  if (shape.kind === 'pdf') {
    body = <PdfPage x={70} y={12} w={100} h={144} fold={24} label="PDF" fontSize={20} />;
  } else if (shape.kind === 'kb' || !shape.px) {
    body = <KbBox x={65} y={12} w={110} h={144} label={format.toUpperCase()} fontSize={20} />;
  } else {
    const b = fitBox(shape.px.w, shape.px.h, SHAPE_STAGE);
    const x = OX + b.x;
    // Centred vertically: a single large drawing reads better than a shelf baseline.
    const y = OY + Math.round((SHAPE_STAGE.h - b.h) / 2);
    const top = y - 10;
    const right = x + b.w + 10;
    body = (
      <>
        <rect
          x={x + 1.25}
          y={y + 1.25}
          width={b.w - 2.5}
          height={b.h - 2.5}
          rx={4}
          className="fill-card stroke-ink"
          strokeWidth={2.5}
          strokeDasharray={shape.kind === 'range' ? '6 4' : undefined}
          data-box={`${b.w}x${b.h}`}
        />
        <Glyph paths={glyphPaths(doc)} cx={x + b.w / 2} cy={y + b.h / 2} size={Math.min(28, b.h - 8)} />
        {labels && (
          <g className="stroke-rule-strong" strokeWidth={1} fill="none">
            <path d={`M${x} ${top} H${x + b.w} M${x} ${top - 4} v8 M${x + b.w} ${top - 4} v8`} />
            <path d={`M${right} ${y} V${y + b.h} M${right - 4} ${y} h8 M${right - 4} ${y + b.h} h8`} />
          </g>
        )}
        {labels && (
          <g className="fill-muted num" style={{ fontSize: 12 }}>
            <text x={x + b.w / 2} y={top - 6} textAnchor="middle">
              {labels.w}
            </text>
            <text x={right + 6} y={y + b.h / 2 + 4} textAnchor="start">
              {labels.h}
            </text>
          </g>
        )}
      </>
    );
  }
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 240 168"
      width="100%"
      className="mx-auto block h-auto max-w-[280px] overflow-visible"
    >
      {body}
    </svg>
  );
}
