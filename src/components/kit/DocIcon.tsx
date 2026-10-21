import type { DocType } from '@/engine/types';
import { FileBadge, FileText, Fingerprint, PenLine, User } from '@/components/ui/Icon';

export function DocIcon({ doc, size = 24 }: { doc: DocType; size?: number }) {
  const props = { size, 'aria-hidden': 'true' as const, class: 'shrink-0' };
  if (doc === 'photo') return <User {...props} />;
  if (doc === 'signature') return <PenLine {...props} />;
  if (doc === 'thumb') return <Fingerprint {...props} />;
  if (doc === 'certificate') return <FileBadge {...props} />;
  return <FileText {...props} />;
}
