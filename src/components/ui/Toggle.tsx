'use client';
import { useId } from 'react';

interface Props {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

/** Accessible switch (role="switch"), whole row is the 48 px target. */
export function Toggle({ label, hint, checked, onChange, disabled }: Props) {
  const id = useId();
  return (
    <div className="flex min-h-tap items-center justify-between gap-3">
      <div className="min-w-0">
        <label htmlFor={id} className="block font-semibold">
          {label}
        </label>
        {hint && (
          <p id={`${id}-hint`} className="text-sm text-muted">
            {hint}
          </p>
        )}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={hint ? `${id}-hint` : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-tap w-[72px] shrink-0 items-center rounded-full border-2 transition-colors disabled:opacity-50 ${
          checked ? 'border-primary bg-primary' : 'border-border-strong bg-surface'
        }`}
      >
        <span
          aria-hidden="true"
          className={`inline-block h-8 w-8 rounded-full shadow transition-transform ${
            checked ? 'translate-x-[30px] bg-on-primary' : 'translate-x-[4px] bg-border-strong'
          }`}
        />
      </button>
    </div>
  );
}
