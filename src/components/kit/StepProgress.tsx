/**
 * "Step 2 of 5 · Signature" with a segmented progress bar (SPEC K9): one segment per
 * document, done ones filled, the current one outlined. Nothing renders for a one-document
 * kit ("Step 1 of 1" tells the user nothing).
 */
import type { ComponentChildren } from 'preact';
import type { T } from '@/lib/format';

export type StepState = 'done' | 'current' | 'todo';

interface Props {
  t: T;
  step: number;
  total: number;
  docName: string;
  done: number;
  /** Per-document state, in kit order. Default: the first `done` are done, `step` is current. */
  states?: StepState[];
  /** Shown at the end of the "Step n of total" line (e.g. an "All documents" link). */
  aside?: ComponentChildren;
}

export function StepProgress({ t, step, total, docName, done, states, aside }: Props) {
  if (total <= 1) return null;
  const text = t('kit.header.stepOf', { n: step, total, doc: docName });
  const segs: StepState[] =
    states ??
    Array.from({ length: total }, (_, i) =>
      i + 1 === step ? 'current' : i < done ? 'done' : 'todo',
    );
  return (
    <div class="space-y-2" data-step={step}>
      <div class="flex items-center justify-between gap-2">
        <p class="min-w-0 font-semibold">
          {text}
          <span class="sr-only">. {t('ui.progress.label', { done, total })}</span>
        </p>
        {aside}
      </div>
      <ol class="flex gap-1" aria-hidden="true">
        {segs.map((s, i) => (
          <li
            key={i}
            class={`h-2 flex-1 rounded-full ${
              s === 'done' ? 'bg-success' : s === 'current' ? 'bg-primary' : 'bg-border'
            }`}
          />
        ))}
      </ol>
    </div>
  );
}
