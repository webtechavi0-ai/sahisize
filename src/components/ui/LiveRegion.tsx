interface Props {
  message: string;
  /** 'assertive' only for errors. */
  politeness?: 'polite' | 'assertive';
}

/** Screen-reader announcements for status changes (SPEC 13). Always mounted. */
export function LiveRegion({ message, politeness = 'polite' }: Props) {
  return (
    <div
      class="sr-only"
      role={politeness === 'assertive' ? 'alert' : 'status'}
      aria-live={politeness}
      aria-atomic="true"
    >
      {message}
    </div>
  );
}
