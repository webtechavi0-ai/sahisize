interface Props {
  value: number;
  max: number;
  label: string;
  /** Shown text; defaults to none (label is announced). */
  valueText?: string;
  class?: string;
}

/**
 * Native <progress> (no inline style, CSP-safe for SSR - QUESTIONS Q10).
 */
export function ProgressBar({ value, max, label, valueText, class: cls = '' }: Props) {
  return (
    <progress
      class={`block h-2 w-full appearance-none overflow-hidden rounded-full bg-border [&::-moz-progress-bar]:bg-primary [&::-webkit-progress-bar]:bg-border [&::-webkit-progress-value]:bg-primary ${cls}`}
      value={Math.max(0, Math.min(value, max))}
      max={max}
      aria-label={label}
      aria-valuetext={valueText}
    >
      {valueText}
    </progress>
  );
}
