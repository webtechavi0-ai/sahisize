'use client';
/**
 * K13 handwritten-declaration trace sheet. Shows the exam's declaration text with the
 * candidate's name filled in; "Download trace sheet" draws an A4 page (150 DPI) on a
 * main-thread canvas -> PNG -> engine imagesToPdf([png], {page:'a4', maxKB:null})
 * (types.ts note, Q16). The name never leaves the device.
 */
import { useId, useState } from 'react';
import { Printer } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { downloadBlob } from '@/lib/download';
import type { T } from '@/lib/format';
import { loadEngine } from './engine';
import { errorMessage } from './errors';

/** Replace the first blank ("____ (Name of the candidate)") with the name. */
export function fillName(text: string, name: string): string {
  const n = name.trim();
  if (!n) return text;
  return text.replace(/_{3,}\s*(\((?:name|नाम)[^)]*\))?/i, n);
}

/** Greedy word wrap with a measure function. */
export function wrapText(text: string, maxWidth: number, measure: (s: string) => number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (line && measure(next) > maxWidth) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

const A4 = { w: 1240, h: 1754 }; // 150 DPI

/** Draw the sheet; returns a PNG blob (null when canvas is unavailable). */
export async function renderTraceSheet(text: string, heading: string): Promise<Blob | null> {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = A4.w;
  canvas.height = A4.h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const margin = 110;
  const lineGap = 84;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, A4.w, A4.h);
  ctx.fillStyle = '#475569';
  ctx.font = '600 26px sans-serif';
  ctx.fillText(heading, margin, margin);
  ctx.font = '40px sans-serif';
  const lines = wrapText(text, A4.w - margin * 2, (s) => ctx.measureText(s).width);
  // Grey text to trace, each line followed by an empty ruled line to copy onto.
  let y = margin + 110;
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 2;
  for (const l of lines) {
    ctx.fillStyle = '#9CA3AF';
    ctx.fillText(l, margin, y);
    for (const yy of [y + 12, y + lineGap + 12]) {
      ctx.beginPath();
      ctx.moveTo(margin, yy);
      ctx.lineTo(A4.w - margin, yy);
      ctx.stroke();
    }
    y += lineGap * 2;
    if (y > A4.h - margin) break;
  }
  return new Promise((r) => canvas.toBlob(r, 'image/png'));
}

interface Props {
  t: T;
  examName: string;
  text: string;
  toVerify?: boolean;
  /** Called after the sheet was downloaded (tool pages emit `tool_used`). */
  onMade?: () => void;
}

export function DeclarationTraceSheet({ t, examName, text, toVerify, onMade }: Props) {
  const id = useId();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const filled = fillName(text, name);

  const make = async () => {
    setBusy(true);
    setError(null);
    try {
      const png = await renderTraceSheet(
        filled,
        t('kit.declaration.sheetHeading', { exam: examName }),
      );
      if (!png) throw new Error('canvas');
      const engine = await loadEngine();
      const pdf = await engine.imagesToPdf([png], { page: 'a4', maxKB: null });
      downloadBlob(new Blob([pdf], { type: 'application/pdf' }), 'declaration-trace.pdf');
      onMade?.();
    } catch (e) {
      setError(errorMessage(t, e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card space-y-3 p-4" aria-labelledby={`${id}-h`}>
      <h3 id={`${id}-h`} className="font-bold">
        {t('kit.declaration.title')}
      </h3>
      <p className="text-sm text-muted">{t('kit.declaration.body')}</p>
      <label className="block" htmlFor={`${id}-n`}>
        <span className="text-sm font-semibold">{t('kit.declaration.name')}</span>
        <input
          id={`${id}-n`}
          type="text"
          autoComplete="name"
          maxLength={60}
          className="mt-1 block min-h-tap w-full rounded-card border border-border-strong bg-surface px-3"
          value={name}
          onInput={(e) => setName(e.currentTarget.value)}
        />
      </label>
      <blockquote className="rounded-card border-l-4 border-primary bg-bg p-3 text-sm" lang="en">
        {filled}
      </blockquote>
      {toVerify && <p className="text-sm text-saffron-text">{t('kit.declaration.toVerify')}</p>}
      <Button block busy={busy} onClick={make}>
        <Printer size={20} aria-hidden="true" />
        {busy ? t('kit.declaration.making') : t('kit.declaration.make')}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-error-text">
          {error}
        </p>
      )}
    </section>
  );
}
