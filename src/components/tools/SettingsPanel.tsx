'use client';
/**
 * Settings card shown above the result on every tool page (SPEC 6.5), plus the small
 * form fields the tools share. Class names only (no SSR style attributes, CSP Q10).
 */
import type { ReactNode } from 'react';
import { useId } from 'react';

export function SettingsPanel({
  title,
  children,
  className: cls = '',
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  const id = useId();
  return (
    <section className={`card space-y-4 p-4 ${cls}`} aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`} className="text-lg font-bold">
        {title}
      </h2>
      {children}
    </section>
  );
}

const INPUT =
  'mt-1 block min-h-tap w-full rounded-card border border-border-strong bg-surface px-3 text-base tabular-nums focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-ink';

export const inputClass = INPUT;

/** Labelled number field. Empty input reports null. */
export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
  hint,
  placeholder,
  disabled,
  invalid,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  min?: number;
  max?: number;
  step?: number | 'any';
  suffix?: string;
  hint?: string;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
}) {
  const id = useId();
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="block text-sm font-semibold">
        {label}
        {suffix && <span className="font-normal text-muted"> ({suffix})</span>}
      </label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        className={`${INPUT}${invalid ? ' border-error' : ''}`}
        value={value ?? ''}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        aria-describedby={hint ? `${id}-hint` : undefined}
        onInput={(e) => {
          const raw = e.currentTarget.value.trim();
          const n = raw === '' ? null : Number(raw);
          onChange(n === null || Number.isFinite(n) ? n : null);
        }}
      />
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-sm text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

/** Segmented single choice (radio group), 48 px targets. */
export function Choice<V extends string | number>({
  label,
  value,
  options,
  onChange,
  disabledValues = [],
  layout = 'wrap',
}: {
  label: string;
  value: V;
  options: readonly { value: V; label: string }[];
  onChange: (v: V) => void;
  disabledValues?: readonly V[];
  /** 'grid': 4 equal columns on phones (2 rows for the KB chips), wrapping row from 640px. */
  layout?: 'wrap' | 'grid';
}) {
  const name = useId();
  const grid = layout === 'grid';
  return (
    <fieldset className="min-w-0">
      <legend className="text-sm font-semibold">{label}</legend>
      <div className={`mt-1 gap-2 ${grid ? 'grid grid-cols-4 sm:flex sm:flex-wrap' : 'flex flex-wrap'}`}>
        {options.map((o) => {
          const checked = o.value === value;
          const disabled = disabledValues.includes(o.value);
          return (
            <label
              key={String(o.value)}
              className={`inline-flex min-h-tap min-w-tap cursor-pointer items-center justify-center rounded-xl border text-sm font-semibold tabular-nums transition-colors duration-150 has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-ink ${
                grid ? 'whitespace-nowrap px-1 sm:px-4' : 'px-4'
              } ${
                checked
                  ? 'border-ink bg-ink text-on-ink shadow-btn'
                  : `border-rule bg-card text-text ${disabled ? '' : 'hover:border-saffron hover:bg-saffron-soft'}`
              } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
            >
              <input
                type="radio"
                className="sr-only"
                name={name}
                value={String(o.value)}
                checked={checked}
                disabled={disabled}
                onChange={() => onChange(o.value)}
              />
              {o.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Inline error for settings, announced. */
export function FieldError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-card border border-error p-3 text-sm text-error-text">
      {message}
    </p>
  );
}

/** Vertical radio list with a title and a sub-line per option (size presets). */
export function OptionList({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly { value: string; title: string; sub?: string }[];
  onChange: (v: string) => void;
}) {
  const name = useId();
  return (
    <fieldset className="min-w-0">
      <legend className="text-sm font-semibold">{label}</legend>
      <div className="mt-1 space-y-2">
        {options.map((o) => {
          const checked = o.value === value;
          return (
            <label
              key={o.value}
              className={`flex min-h-tap cursor-pointer items-start gap-3 rounded-card border p-3 has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-ink ${
                checked ? 'border-ink bg-paper ring-1 ring-ink' : 'border-rule hover:border-ink'
              }`}
            >
              <input
                type="radio"
                className="mt-1 h-5 w-5 shrink-0 accent-ink"
                name={name}
                value={o.value}
                checked={checked}
                onChange={() => onChange(o.value)}
              />
              <span className="min-w-0">
                <span className="block font-semibold tabular-nums">{o.title}</span>
                {o.sub && <span className="block text-sm text-muted">{o.sub}</span>}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Native drop-down (one 48 px row; phones open their own big list). */
export function SelectField({
  label,
  value,
  options,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (v: string) => void;
  hint?: string;
}) {
  const id = useId();
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="block font-semibold">
        {label}
      </label>
      <select
        id={id}
        className={`${INPUT} truncate font-semibold`}
        value={value}
        aria-describedby={hint ? `${id}-hint` : undefined}
        onChange={(e) => onChange(e.currentTarget.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-sm text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}
