import type { ReactNode } from 'react';
import RootShell from '@/components/layout/RootShell';

export default function EnLayout({ children }: { children: ReactNode }) {
  return <RootShell lang="en">{children}</RootShell>;
}
