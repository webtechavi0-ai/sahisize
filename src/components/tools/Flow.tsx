/**
 * Small building blocks for the upload → result flow every tool page shares:
 *  - MoreOptions: collapsed <details> for the settings most people never need
 *  - Working: a plain "Making it 20 KB…" card while the engine runs
 *  - ErrorBox: a plain-words error with one or two buttons that fix it
 *  - GoalLine: "We'll make it 20 KB." above the upload buttons
 * Class names only (no inline styles, CSP Q10). 48 px targets.
 */
import type { ComponentChildren } from 'preact';
import { useId } from 'preact/hooks';
import { Button } from '@/components/ui/Button';
import { ChevronRight, TriangleAlert } from '@/components/ui/Icon';

export function MoreOptions({
  title,
  hint,
  open,
  onToggle,
  children,
  class: cls = '',
}: {
  title: string;
  /** One short line under the title, e.g. "Only if your form asks for something different." */
  hint?: string;
  open?: boolean;
  onToggle?: (open: boolean) => void;
  children: ComponentChildren;
  class?: string;
}) {
  return (
    <details
      class={`group card ${cls}`}
      open={open}
      onToggle={(e) => onToggle?.((e.currentTarget as HTMLDetailsElement).open)}
      data-more-options
    >
      <summary class="flex min-h-tap cursor-pointer list-none items-center gap-3 rounded-card p-4 marker:hidden focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-ink [&::-webkit-details-marker]:hidden">
        <ChevronRight
          size={20}
          aria-hidden="true"
          class="shrink-0 text-ink transition-transform duration-150 group-open:rotate-90 motion-reduce:transition-none"
        />
        <span class="min-w-0 flex-1">
          <span class="block font-bold text-ink">{title}</span>
          {hint && <span class="block text-sm text-muted">{hint}</span>}
        </span>
      </summary>
      <div class="space-y-4 border-t border-rule p-4">{children}</div>
    </details>
  );
}

/** Visible progress text (not only a grey block) so people know the phone is working. */
export function Working({ label }: { label: string }) {
  return (
    <div class="card flex min-h-[120px] items-center gap-4 p-5" role="status" data-tool-working>
      <span
        class="inline-block h-8 w-8 shrink-0 animate-spin rounded-full border-4 border-saffron border-r-transparent motion-reduce:animate-none"
        aria-hidden="true"
      />
      <p class="text-lg font-semibold">{label}</p>
    </div>
  );
}

export interface FixAction {
  label: string;
  onClick: () => void;
  primary?: boolean;
}

export function ErrorBox({ message, hint, actions = [] }: { message: string; hint?: string; actions?: FixAction[] }) {
  const id = useId();
  return (
    <div class="space-y-3 rounded-card border-2 border-error bg-card p-4" role="alert" aria-labelledby={`${id}-m`} data-tool-error>
      <p id={`${id}-m`} class="flex items-start gap-2 font-semibold text-error-text">
        <TriangleAlert size={20} aria-hidden="true" class="mt-0.5 shrink-0" />
        <span>{message}</span>
      </p>
      {hint && <p class="text-sm">{hint}</p>}
      {actions.length > 0 && (
        <div class="grid gap-2 sm:grid-cols-2">
          {actions.map((a) => (
            <Button key={a.label} variant={a.primary ? 'primary' : 'secondary'} block onClick={a.onClick}>
              {a.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

/** The target in plain words, shown big above the upload buttons. */
export function GoalLine({ text }: { text: string }) {
  return (
    <p class="text-lg font-bold leading-snug text-ink" data-tool-goal>
      {text}
    </p>
  );
}
