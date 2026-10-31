interface Props {
  /** Tailwind size classes, e.g. "h-6 w-1/2". */
  className?: string;
  label?: string;
}

/** Loading placeholder (SPEC 6.1: skeletons, never blank screens). */
export function Skeleton({ className: cls = 'h-6 w-full', label }: Props) {
  return (
    <div
      className={`animate-pulse rounded-card bg-border ${cls}`}
      role={label ? 'status' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : 'true'}
    />
  );
}
