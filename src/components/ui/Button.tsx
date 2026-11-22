import type { ReactNode, HTMLAttributes } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const BASE =
  'inline-flex min-h-tap min-w-tap select-none items-center justify-center gap-2 rounded-xl px-4 py-2 text-base font-semibold shadow-btn transition-[transform,box-shadow,background-color,border-color] duration-150 ease-out hover:shadow-btn-hover active:scale-[.98] motion-reduce:transform-none focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:active:scale-100';

const VARIANTS: Record<ButtonVariant, string> = {
  // One saffron action per screen (SPEC 6.1). Saffron fills carry ink text, never white.
  primary: 'bg-saffron font-bold text-on-saffron hover:bg-saffron-hover focus-visible:outline-heading disabled:hover:bg-saffron dark:focus-visible:outline-saffron',
  secondary: 'border-[1.5px] border-rule-strong bg-card text-ink shadow-none hover:border-ink hover:bg-ink-soft hover:shadow-none',
  ghost: 'text-ink shadow-none hover:bg-ink-soft hover:shadow-none',
  danger: 'border border-danger bg-card text-danger-text hover:bg-band',
};

export function buttonClass(
  variant: ButtonVariant = 'secondary',
  block = false,
  extra = '',
): string {
  return `${BASE} ${VARIANTS[variant]}${block ? ' w-full' : ''}${extra ? ` ${extra}` : ''}`;
}

type Props = Omit<HTMLAttributes<HTMLButtonElement>, 'className'> & {
  variant?: ButtonVariant;
  block?: boolean;
  busy?: boolean;
  className?: string;
  type?: 'button' | 'submit';
  disabled?: boolean;
  children?: ReactNode;
};

/** 48 px minimum target, visible focus ring. `busy` sets aria-busy and disables. */
export function Button({
  variant = 'secondary',
  block = false,
  busy = false,
  className: extra = '',
  type = 'button',
  disabled,
  children,
  ...rest
}: Props) {
  return (
    <button
      type={type}
      className={buttonClass(variant, block, extra)}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      {...rest}
    >
      {busy && (
        <span
          className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent"
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  );
}

type LinkProps = Omit<HTMLAttributes<HTMLAnchorElement>, 'className'> & {
  href: string;
  variant?: ButtonVariant;
  block?: boolean;
  className?: string;
  children?: ReactNode;
};

export function ButtonLink({
  variant = 'secondary',
  block = false,
  className: extra = '',
  children,
  ...rest
}: LinkProps) {
  return (
    <a className={`${buttonClass(variant, block, extra)} no-underline`} {...rest}>
      {children}
    </a>
  );
}
