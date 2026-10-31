/**
 * Pass check card (SPEC K7): one row per rule with ✓/✗ and actual vs required.
 * `canDownload(checks)` is false while any *required* row fails; warnings and info rows
 * never block. Info rows (not checkable / n-a) are hidden; labels are plain words.
 * Reusable by tool islands (F).
 */
import type { ReactNode } from 'react';
import type { FitCheck } from '@/engine/types';
import { CircleCheck, CircleX, TriangleAlert } from '@/components/ui/Icon';
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
  children?: ReactNode;
}

export function PassCheck({ t, checks, title, verdict, verdictSub, children }: Props) {
  const ok = canDownload(checks);
  if (verdict) {
    return (
      <section
        className={`card p-4 ${ok ? 'border-success' : 'border-error'}`}
        aria-labelledby="passcheck-title"
        data-verdict={ok ? 'pass' : 'fail'}
      >
        <div className="flex items-center gap-3">
          {ok ? (
            <CircleCheck size={36} aria-hidden="true" className="shrink-0 text-success" />
          ) : (
            <CircleX size={36} aria-hidden="true" className="shrink-0 text-error" />
          )}
          <div className="min-w-0">
            <h3
              id="passcheck-title"
              className={`text-xl font-bold ${ok ? 'text-success-text' : 'text-error-text'}`}
            >
              {verdict}
            </h3>
            {verdictSub && <p className="text-sm">{verdictSub}</p>}
          </div>
        </div>
        <details className="mt-2" open={!ok}>
          <summary className="flex min-h-tap cursor-pointer items-center font-semibold text-primary">
            {t('ui.passCheck.details')}
          </summary>
          <div className="space-y-3 pt-1">
            {children}
            {rows(t, checks)}
          </div>
        </details>
      </section>
    );
  }
  return (
    <section className="card p-4" aria-labelledby="passcheck-title">
      <div className="flex items-center justify-between gap-2">
        <h3 id="passcheck-title" className="font-bold">
          {title ?? t('ui.passCheck.title')}
        </h3>
        <span
          className={`rounded-full px-3 py-1 text-sm font-semibold ${
            ok ? 'bg-success/15 text-success-text' : 'bg-error/15 text-error-text'
          }`}
        >
          {ok ? t('common.status.pass') : t('common.status.fail')}
        </span>
      </div>
      <div className="mt-3">{rows(t, checks)}</div>
    </section>
  );
}

/** Rows a person sees: info rows (not checkable / not applicable) are hidden. */
export function visibleChecks(checks: readonly FitCheck[]): FitCheck[] {
  return checks.filter((c) => (c.level ?? 'required') !== 'info');
}

/** Plain wording for engine values that are jargon (labels only; pass/fail is unchanged). */
function plainValue(t: T, c: FitCheck, v: string): string {
  if (c.rule === 'baseline') {
    return v === 'Baseline' ? t('ui.passCheck.standardJpg') : t('ui.passCheck.otherJpg');
  }
  return v;
}

function rows(t: T, checks: readonly FitCheck[]) {
  return (
    <ul className="divide-y divide-border">
      {visibleChecks(checks).map((c) => {
        const level = c.level ?? 'required';
        const label = t(`common.checks.${c.rule}`);
        const actual = plainValue(t, c, c.actual);
        const value = c.pass
          ? actual
          : t('common.checks.actualVsRequired', {
              actual,
              required: plainValue(t, c, c.required),
            });
        let icon;
        let status: string;
        if (c.pass) {
          icon = <CircleCheck size={20} aria-hidden="true" className="shrink-0 text-success" />;
          status = t('common.status.pass');
        } else if (level === 'warning') {
          icon = <TriangleAlert size={20} aria-hidden="true" className="shrink-0 text-saffron-text" />;
          status = t('ui.passCheck.warning');
        } else {
          icon = <CircleX size={20} aria-hidden="true" className="shrink-0 text-error" />;
          status = t('common.status.fail');
        }
        return (
          <li
            key={c.rule}
            className="flex items-start gap-3 py-2"
            data-rule={c.rule}
            data-pass={String(c.pass)}
          >
            {icon}
            <span className="sr-only">{status}:</span>
            <span className="min-w-0 flex-1 text-sm">
              <span className="font-semibold">{label}:</span>{' '}
              <span
                className={`tabular-nums ${
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
