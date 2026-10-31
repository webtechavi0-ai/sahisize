'use client';
import type { ReactNode } from 'react';

export default function ReloadLink({ children }: { children: ReactNode }) {
  return (
    <button
      type="button"
      className="btn-action"
      data-reload
      onClick={() => location.reload()}
    >
      {children}
    </button>
  );
}
