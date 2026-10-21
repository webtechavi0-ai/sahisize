/**
 * Settings card shown above the result on every tool page (SPEC 6.5), plus the small
 * form fields the tools share. Class names only (no SSR style attributes, CSP Q10).
 */
import type { ComponentChildren } from 'preact';
import { useId } from 'preact/hooks';

export function SettingsPanel({
  title,
  children,
  class: cls = '',
}: {
  title: string;
  children: ComponentChildren;
  class?: string;
}) {
  const id = useId();
  return (
    <section class={`card space-y-4 p-4 ${cls}`} aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`} class="text-lg font-bold">
        {title}
      </h2>
      {children}
    </section>
  );
}

const INPUT =
  'mt-1 block min-h-tap w-full rounded-card border border-border-strong bg-surface px-3 text-base tabular-nums focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-primary';

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
    <div class="min-w-0">
      <label for={id} class="block text-sm font-semibold">
        {label}
        {suffix && <span class="font-normal text-muted"> ({suffix})</span>}
      </label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        class={`${INPUT}${invalid ? ' border-error' : ''}`}
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
        <p id={`${id}-hint`} class="mt-1 text-sm text-muted">
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
}: {
  label: string;
  value: V;
  options: readonly { value: V; label: string }[];
  onChange: (v: V) => void;
  disabledValues?: readonly V[];
}) {
  const name = useId();
  return (
    <fieldset class="min-w-0">
      <legend class="text-sm font-semibold">{label}</legend>
      <div class="mt-1 flex flex-wrap gap-2">
        {options.map((o) => {
          const checked = o.value === value;
          const disabled = disabledValues.includes(o.value);
          return (
            <label
              key={String(o.value)}
              class={`inline-flex min-h-tap min-w-tap cursor-pointer items-center justify-center rounded-card border px-4 text-sm font-semibold has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-primary ${
                checked
                  ? 'border-primary bg-primary text-on-primary'
                  : 'border-border-strong bg-surface text-text'
              } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
            >
              <input
                type="radio"
                class="sr-only"
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
    <p role="alert" class="rounded-card border border-error p-3 text-sm text-error-text">
      {message}
    </p>
  );
}
