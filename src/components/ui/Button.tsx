import type { ComponentChildren, JSX } from 'preact';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const BASE =
  'inline-flex min-h-tap min-w-tap select-none items-center justify-center gap-2 rounded-xl px-4 py-2 text-base font-semibold shadow-btn transition duration-150 ease-out hover:-translate-y-px hover:shadow-btn-hover active:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:translate-y-0';

const VARIANTS: Record<ButtonVariant, string> = {
  // One saffron action per screen (SPEC 6.1). Saffron fills carry ink text, never white.
  primary: 'bg-saffron text-on-saffron hover:bg-saffron-hover disabled:hover:bg-saffron',
  secondary: 'border border-rule-strong bg-card text-ink hover:border-ink hover:bg-paper',
  ghost: 'text-ink shadow-none hover:bg-saffron-soft hover:shadow-none',
  danger: 'border border-danger bg-card text-danger-text hover:bg-paper',
};

export function buttonClass(
  variant: ButtonVariant = 'secondary',
  block = false,
  extra = '',
): string {
  return `${BASE} ${VARIANTS[variant]}${block ? ' w-full' : ''}${extra ? ` ${extra}` : ''}`;
}

type Props = Omit<JSX.HTMLAttributes<HTMLButtonElement>, 'class' | 'className'> & {
  variant?: ButtonVariant;
  block?: boolean;
  busy?: boolean;
  class?: string;
  type?: 'button' | 'submit';
  disabled?: boolean;
  children?: ComponentChildren;
};

/** 48 px minimum target, visible focus ring. `busy` sets aria-busy and disables. */
export function Button({
  variant = 'secondary',
  block = false,
  busy = false,
  class: extra = '',
  type = 'button',
  disabled,
  children,
  ...rest
}: Props) {
  return (
    <button
      type={type}
      class={buttonClass(variant, block, extra)}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      {...rest}
    >
      {busy && (
        <span
          class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent"
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  );
}

type LinkProps = Omit<JSX.HTMLAttributes<HTMLAnchorElement>, 'class' | 'className'> & {
  href: string;
  variant?: ButtonVariant;
  block?: boolean;
  class?: string;
  children?: ComponentChildren;
};

export function ButtonLink({
  variant = 'secondary',
  block = false,
  class: extra = '',
  children,
  ...rest
}: LinkProps) {
  return (
    <a class={`${buttonClass(variant, block, extra)} no-underline`} {...rest}>
      {children}
    </a>
  );
}
