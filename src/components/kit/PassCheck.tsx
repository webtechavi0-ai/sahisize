/**
 * Pass check card (SPEC K7): one row per rule with ✓/✗ and actual vs required.
 * `canDownload(checks)` is false while any *required* row fails; warnings and info rows
 * never block. Reusable by tool islands (F).
 */
import type { ComponentChildren } from 'preact';
import type { FitCheck } from '@/engine/types';
import { CircleCheck, CircleX, Info, TriangleAlert } from '@/components/ui/Icon';
import type { T } from '@/lib/format';

export function isRequired(c: FitCheck): boolean {
  return (c.level ?? 'required') === 'required';
}

export function failedRequired(checks: readonly FitCheck[]): FitCheck[] {
  return checks.filter((c) => isRequired(c) && !c.pass);
}

export function canDownload(checks: readonly FitCheck[]): boolean {
  return checks.length > 0 && failedRequired(checks).length === 0;
}

/** Sentence for aria-live after a fit. */
export function passSummary(t: T, checks: readonly FitCheck[]): string {
  const n = failedRequired(checks).length;
  return n === 0 ? t('ui.passCheck.allPass') : t('ui.passCheck.someFail', { n });
}

interface Props {
  t: T;
  checks: readonly FitCheck[];
  title?: string;
  /**
   * Plain-language verdict mode (optional, kit result screen): a big tick or cross with
   * `verdict` (e.g. "Ready for IBPS PO") and `verdictSub`, and the technical rows folded
   * under "Details" (open by default when a required rule fails). Without it the card
   * looks as before.
   */
  verdict?: string;
  verdictSub?: string;
  /** Extra content shown inside "Details" above the rows (verdict mode only). */
  children?: ComponentChildren;
}

export function PassCheck({ t, checks, title, verdict, verdictSub, children }: Props) {
  const ok = canDownload(checks);
  if (verdict) {
    return (
      <section
        class={`card p-4 ${ok ? 'border-success' : 'border-error'}`}
        aria-labelledby="passcheck-title"
        data-verdict={ok ? 'pass' : 'fail'}
      >
        <div class="flex items-center gap-3">
          {ok ? (
            <CircleCheck size={36} aria-hidden="true" class="shrink-0 text-success" />
          ) : (
            <CircleX size={36} aria-hidden="true" class="shrink-0 text-error" />
          )}
          <div class="min-w-0">
            <h3
              id="passcheck-title"
              class={`text-xl font-bold ${ok ? 'text-success-text' : 'text-error-text'}`}
            >
              {verdict}
            </h3>
            {verdictSub && <p class="text-sm">{verdictSub}</p>}
          </div>
        </div>
        <details class="mt-2" open={!ok}>
          <summary class="flex min-h-tap cursor-pointer items-center font-semibold text-primary">
            {t('ui.passCheck.details')}
          </summary>
          <div class="space-y-3 pt-1">
            {children}
            {rows(t, checks)}
          </div>
        </details>
      </section>
    );
  }
  return (
    <section class="card p-4" aria-labelledby="passcheck-title">
      <div class="flex items-center justify-between gap-2">
        <h3 id="passcheck-title" class="font-bold">
          {title ?? t('ui.passCheck.title')}
        </h3>
        <span
          class={`rounded-full px-3 py-1 text-sm font-semibold ${
            ok ? 'bg-success/15 text-success-text' : 'bg-error/15 text-error-text'
          }`}
        >
          {ok ? t('common.status.pass') : t('common.status.fail')}
        </span>
      </div>
      <div class="mt-3">{rows(t, checks)}</div>
    </section>
  );
}

function rows(t: T, checks: readonly FitCheck[]) {
  return (
    <ul class="divide-y divide-border">
      {checks.map((c) => {
        const level = c.level ?? 'required';
        const label = t(`common.checks.${c.rule}`);
        const value = c.pass
          ? c.actual
          : t('common.checks.actualVsRequired', { actual: c.actual, required: c.required });
        let icon;
        let status: string;
        if (level === 'info') {
          icon = <Info size={20} aria-hidden="true" class="shrink-0 text-muted" />;
          status = t('ui.passCheck.info');
        } else if (c.pass) {
          icon = <CircleCheck size={20} aria-hidden="true" class="shrink-0 text-success" />;
          status = t('common.status.pass');
        } else if (level === 'warning') {
          icon = <TriangleAlert size={20} aria-hidden="true" class="shrink-0 text-saffron-text" />;
          status = t('ui.passCheck.warning');
        } else {
          icon = <CircleX size={20} aria-hidden="true" class="shrink-0 text-error" />;
          status = t('common.status.fail');
        }
        return (
          <li
            key={c.rule}
            class="flex items-start gap-3 py-2"
            data-rule={c.rule}
            data-pass={String(c.pass)}
          >
            {icon}
            <span class="sr-only">{status}:</span>
            <span class="min-w-0 flex-1">
              <span class="block text-sm font-semibold">{label}</span>
              <span
                class={`block text-sm tabular-nums ${
                  !c.pass && level === 'required' ? 'text-error-text' : 'text-muted'
                }`}
              >
                {value}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
