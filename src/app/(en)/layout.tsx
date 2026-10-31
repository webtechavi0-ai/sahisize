import type { ReactNode } from 'react';
import RootShell from '@/components/layout/RootShell';
import type { Viewport } from 'next';

export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function EnLayout({ children }: { children: ReactNode }) {
  return <RootShell lang="en">{children}</RootShell>;
}
