/**
 * Target size picker (T1, T7, T9): preset chips 10–500 KB plus a custom number.
 */
import { KB_PRESETS, MAX_TARGET_KB, MIN_TARGET_KB } from './logic';
import { Choice, NumberField } from './SettingsPanel';
import type { T } from '@/lib/format';

export function TargetKbPicker({
  t,
  value,
  onChange,
  presets = KB_PRESETS,
  label,
}: {
  t: T;
  value: number | null;
  onChange: (kb: number | null) => void;
  presets?: readonly number[];
  label?: string;
}) {
  const isPreset = value !== null && presets.includes(value);
  const options = [
    ...presets.map((n) => ({ value: String(n), label: t('common.units.kb', { n }) })),
    { value: 'custom', label: t('tool.common.custom') },
  ];
  return (
    <div class="space-y-3">
      <Choice
        label={label ?? t('tool.common.targetKb')}
        value={isPreset ? String(value) : 'custom'}
        options={options}
        layout="grid"
        onChange={(v) => {
          if (v === 'custom') {
            if (isPreset) onChange(null);
          } else onChange(Number(v));
        }}
      />
      {!isPreset && (
        <NumberField
          label={t('tool.common.customKb')}
          suffix="KB"
          value={value}
          min={MIN_TARGET_KB}
          max={MAX_TARGET_KB}
          step="any"
          onChange={onChange}
          hint={t('tool.common.customKbHint', { min: MIN_TARGET_KB, max: MAX_TARGET_KB })}
        />
      )}
    </div>
  );
}
