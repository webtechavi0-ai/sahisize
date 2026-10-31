'use client';
/**
 * K11: name + date printed in black on white under the face, inside the final pixels.
 * The values stay on the device (never sent to analytics).
 */
import { useId } from 'react';
import type { NameDate } from '@/engine/types';
import type { T } from '@/lib/format';

export function todayDdMmYyyy(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function isNameDateComplete(v: NameDate | undefined): v is NameDate {
  return !!v && v.name.trim().length > 0 && v.date.trim().length > 0;
}

interface Props {
  t: T;
  examName: string;
  value: NameDate;
  onChange: (v: NameDate) => void;
}

export function NameDateStripForm({ t, examName, value, onChange }: Props) {
  const id = useId();
  const field =
    'mt-1 block min-h-tap w-full rounded-card border border-border-strong bg-surface px-3 text-base';
  return (
    <fieldset className="card space-y-3 p-4">
      <legend className="px-1 font-bold">{t('kit.nameDate.title')}</legend>
      <p className="text-sm text-muted">{t('kit.nameDate.hint', { exam: examName })}</p>
      <label className="block" htmlFor={`${id}-n`}>
        <span className="text-sm font-semibold">{t('kit.nameDate.name')}</span>
        <input
          id={`${id}-n`}
          className={field}
          type="text"
          autoComplete="name"
          maxLength={40}
          value={value.name}
          onInput={(e) => onChange({ ...value, name: e.currentTarget.value })}
        />
      </label>
      <label className="block" htmlFor={`${id}-d`}>
        <span className="text-sm font-semibold">{t('kit.nameDate.date')}</span>
        <input
          id={`${id}-d`}
          className={field}
          type="text"
          inputMode="numeric"
          placeholder="DD/MM/YYYY"
          maxLength={12}
          value={value.date}
          onInput={(e) => onChange({ ...value, date: e.currentTarget.value })}
        />
      </label>
    </fieldset>
  );
}
