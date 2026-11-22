/**
 * Card shell shared by every side-rail block (inner-pages spec §3.0): rounded card, 32 px icon
 * well and an H2 styled as text-h3. Server component.
 */
import type { ReactNode } from 'react';
import Icon, { type SiteIconName } from '@/components/site/Icon';

export type WellTone = 'ink' | 'saffron' | 'chalk';

const WELL: Record<WellTone, string> = {
  ink: 'bg-ink-soft text-ink',
  saffron: 'bg-saffron-soft text-saffron-text',
  chalk: 'bg-chalk-soft text-chalk',
};

export interface BlockShellProps {
  /** data-rail-block value. */
  block: string;
  /** Heading id (rail-… unless the block is an existing element moved into the rail). */
  headingId: string;
  title: ReactNode;
  icon: SiteIconName;
  tone?: WellTone;
  as?: 'section' | 'nav';
  className?: string;
  /** Extra attributes on the block (e.g. data-source-status). */
  attrs?: Record<string, string>;
  children: ReactNode;
}

export default function BlockShell({
  block,
  headingId,
  title,
  icon,
  tone = 'ink',
  as: Tag = 'section',
  className = '',
  attrs,
  children,
}: BlockShellProps) {
  return (
    <Tag
      data-rail-block={block}
      aria-labelledby={headingId}
      className={`min-w-0 rounded-card border border-rule bg-card p-4 shadow-e1 xl:p-5 ${className}`}
      {...attrs}
    >
      <h2 id={headingId} className="flex items-center gap-2 text-h3">
        <span aria-hidden="true" className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl ${WELL[tone]}`}>
          <Icon name={icon} size={18} />
        </span>
        <span className="min-w-0">{title}</span>
      </h2>
      <div className="mt-3">{children}</div>
    </Tag>
  );
}
