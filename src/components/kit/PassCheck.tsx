/**
 * Pass check card (SPEC K7): one row per rule with ✓/✗ and actual vs required.
 * `canDownload(checks)` is false while any *required* row fails; warnings and info rows
 * never block. Reusable by tool islands (F).
 */
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
}

export function PassCheck({ t, checks, title }: Props) {
  const ok = canDownload(checks);
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
      <ul class="mt-3 divide-y divide-border">
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
            icon = (
              <TriangleAlert size={20} aria-hidden="true" class="shrink-0 text-saffron-text" />
            );
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
    </section>
  );
}
