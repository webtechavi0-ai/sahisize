'use client';
/** Web Share button (SPEC K10). Renders nothing where file sharing is unsupported. */
import { useEffect, useState } from 'react';
import { Share2 } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { canShareFiles, shareFiles } from '@/lib/download';

interface Props {
  label: string;
  title: string;
  getFiles: () => Promise<File[]> | File[];
  onShared?: () => void;
  block?: boolean;
}

export function ShareButton({ label, title, getFiles, onShared, block }: Props) {
  const [supported, setSupported] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    try {
      setSupported(
        canShareFiles([new File([new Uint8Array(1)], 'probe.jpg', { type: 'image/jpeg' })]),
      );
    } catch {
      setSupported(false);
    }
  }, []);
  if (!supported) return null;
  return (
    <Button
      block={block}
      busy={busy}
      onClick={async () => {
        setBusy(true);
        try {
          if (await shareFiles(await getFiles(), title)) onShared?.();
        } finally {
          setBusy(false);
        }
      }}
    >
      <Share2 size={20} aria-hidden="true" />
      {label}
    </Button>
  );
}
