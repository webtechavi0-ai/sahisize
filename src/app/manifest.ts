import type { MetadataRoute } from 'next';
import { manifest } from '@/config/pwa';

export const dynamic = 'force-static';

export default function manifestRoute(): MetadataRoute.Manifest {
  return manifest as unknown as MetadataRoute.Manifest;
}
