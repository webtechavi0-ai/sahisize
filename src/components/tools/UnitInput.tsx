/**
 * Width/height in px, cm, mm or inches with a DPI field and an aspect-lock switch (T2).
 * Values are kept in the chosen unit; the island converts with toPx()/fromPx().
 */
import { Toggle } from '@/components/ui/Toggle';
import type { T } from '@/lib/format';
import { SIZE_UNITS, type SizeUnit } from './logic';
import { Choice, NumberField } from './SettingsPanel';

export interface UnitSize {
  w: number | null;
  h: number | null;
  unit: SizeUnit;
  dpi: number | null;
  lock: boolean;
}

export function UnitInput({
  t,
  value,
  onWidth,
  onHeight,
  onUnit,
  onDpi,
  onLock,
  pxPreview,
  invalid,
}: {
  t: T;
  value: UnitSize;
  onWidth: (v: number | null) => void;
  onHeight: (v: number | null) => void;
  onUnit: (u: SizeUnit) => void;
  onDpi: (v: number | null) => void;
  onLock: (on: boolean) => void;
  /** "472×157 px" shown when the unit is physical. */
  pxPreview?: string;
  invalid?: boolean;
}) {
  const step = value.unit === 'px' ? 1 : 0.01;
  const unitLabel = t(`tool.units.${value.unit}`);
  return (
    <div class="space-y-3">
      <Choice
        label={t('tool.resize.unit')}
        value={value.unit}
        options={SIZE_UNITS.map((u) => ({ value: u, label: t(`tool.units.${u}`) }))}
        onChange={onUnit}
      />
      <div class="grid grid-cols-2 gap-3">
        <NumberField
          label={t('tool.resize.width')}
          suffix={unitLabel}
          value={value.w}
          min={0}
          step={step}
          onChange={onWidth}
          invalid={invalid}
        />
        <NumberField
          label={t('tool.resize.height')}
          suffix={unitLabel}
          value={value.h}
          min={0}
          step={step}
          onChange={onHeight}
          invalid={invalid}
        />
      </div>
      <Toggle label={t('tool.resize.lock')} hint={t('tool.resize.lockHint')} checked={value.lock} onChange={onLock} />
      <NumberField
        label={t('tool.resize.dpi')}
        suffix="DPI"
        value={value.dpi}
        min={50}
        max={1200}
        onChange={onDpi}
        hint={value.unit === 'px' ? t('tool.resize.dpiHintPx') : t('tool.resize.dpiHint')}
      />
      {pxPreview && value.unit !== 'px' && (
        <p class="text-sm tabular-nums text-muted" aria-live="polite">
          {t('tool.resize.inPixels', { px: pxPreview })}
        </p>
      )}
    </div>
  );
}
