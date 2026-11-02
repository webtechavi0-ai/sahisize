import type { MetadataRoute } from 'next';
import { PWA_MANIFEST } from '@/config/pwa';

export const dynamic = 'force-static';

export default function manifestRoute(): MetadataRoute.Manifest {
  return PWA_MANIFEST as unknown as MetadataRoute.Manifest;
}
