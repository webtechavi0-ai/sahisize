import { useId } from 'preact/hooks';

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
    <div class="flex min-h-tap items-center justify-between gap-3">
      <div class="min-w-0">
        <label for={id} class="block font-semibold">
          {label}
        </label>
        {hint && (
          <p id={`${id}-hint`} class="text-sm text-muted">
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
        class={`relative inline-flex h-tap w-[72px] shrink-0 items-center rounded-full border-2 transition-colors disabled:opacity-50 ${
          checked ? 'border-primary bg-primary' : 'border-border-strong bg-surface'
        }`}
      >
        <span
          aria-hidden="true"
          class={`inline-block h-8 w-8 rounded-full shadow transition-transform ${
            checked ? 'translate-x-[30px] bg-on-primary' : 'translate-x-[4px] bg-border-strong'
          }`}
        />
      </button>
    </div>
  );
}
