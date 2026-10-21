import { useId } from 'preact/hooks';

interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onInput: (value: number) => void;
  /** Text shown beside the label and used as aria-valuetext. */
  valueText?: string;
  disabled?: boolean;
  /** Visually hide the label (still announced). */
  hideLabel?: boolean;
}

/** Native range input: keyboard and screen-reader support for free, 48 px tall. */
export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onInput,
  valueText,
  disabled,
  hideLabel,
}: Props) {
  const id = useId();
  return (
    <div class="w-full">
      <div class={hideLabel ? 'sr-only' : 'flex items-baseline justify-between gap-2 text-sm'}>
        <label for={id} class="font-semibold">
          {label}
        </label>
        {valueText && !hideLabel && <span class="tabular-nums text-muted">{valueText}</span>}
      </div>
      <input
        id={id}
        type="range"
        class="h-tap w-full cursor-pointer accent-primary disabled:opacity-50"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-valuetext={valueText}
        onInput={(e) => onInput(Number((e.currentTarget as HTMLInputElement).value))}
      />
    </div>
  );
}
