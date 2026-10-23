/**
 * Responsive frame shared by the tool islands (layout only):
 *  - phone (<640px) and tablet (640–1023px): one column, in this order: the file card
 *    (`input`), then the result (`output`), then `settings`. The result is the hero, so it
 *    comes straight after the upload and above any options.
 *  - desktop (>=1024px): two columns. Left: file card, then settings. Right: a sticky column
 *    with the preview, result and download. Before a result exists the right column shows
 *    a quiet placeholder (desktop only, so phones keep the result right after the upload).
 */
import type { ComponentChildren } from 'preact';
import { ImageIcon } from '@/components/ui/Icon';

export function ToolColumns({
  input,
  output,
  settings,
  empty,
  footer,
  active,
}: {
  input: ComponentChildren;
  /** Preview, result and download. */
  output: ComponentChildren;
  /** Options: after the result on phones, under the file card on desktop. */
  settings?: ComponentChildren;
  /** Whether `output` has anything to show (busy, error or result); false → the placeholder. */
  active?: boolean;
  /** Placeholder text for the empty right column. */
  empty?: string;
  /** Rendered after both columns (live regions, dialogs). */
  footer?: ComponentChildren;
}) {
  const hasOutput = active ?? Boolean(output);
  return (
    <div class="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:grid-rows-[auto_1fr] lg:items-start lg:gap-x-8">
      <div class="min-w-0 space-y-4 lg:col-start-1 lg:row-start-1">{input}</div>
      <div
        class={`min-w-0 space-y-4 lg:sticky lg:top-4 lg:col-start-2 lg:row-span-2 lg:row-start-1 ${hasOutput ? '' : 'hidden lg:block'}`}
        data-tool-output
      >
        {hasOutput
          ? output
          : empty && (
              <div class="hidden min-h-[320px] flex-col items-center justify-center gap-3 rounded-card border-2 border-dashed border-rule bg-card/70 p-8 text-center text-muted lg:flex">
                <ImageIcon size={40} aria-hidden="true" class="text-rule-strong" />
                <p class="max-w-xs text-sm">{empty}</p>
              </div>
            )}
      </div>
      {settings && <div class="min-w-0 space-y-4 lg:col-start-1 lg:row-start-2">{settings}</div>}
      {footer && <div class="lg:col-span-2">{footer}</div>}
    </div>
  );
}
