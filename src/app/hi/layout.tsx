import type { ReactNode } from 'react';
import RootShell from '@/components/layout/RootShell';

export default function HiLayout({ children }: { children: ReactNode }) {
  return <RootShell lang="hi">{children}</RootShell>;
}
