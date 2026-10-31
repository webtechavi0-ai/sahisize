import type { Metadata } from 'next';
import ToolsIndex from '@/components/site/ToolsIndex';
import { buildMetadata } from '@/seo/metadata';
import { staticAlternates } from '@/seo/hreflang';

export const dynamic = 'force-static';

const TITLE = 'Free Image, Signature and PDF Tools for Exams | SahiSize';
const DESC =
  'Compress to any KB, resize in px or cm, convert HEIC to JPG, clean a signature, combine certificates into a PDF. Free, on your device, never uploaded.';

export function generateMetadata(): Metadata {
  return buildMetadata({
    title: TITLE,
    description: DESC,
    lang: 'en',
    canonicalPath: '/tools',
    alternates: staticAlternates('/tools'),
  });
}

export default function Page() {
  return <ToolsIndex lang="en" title={TITLE} description={DESC} />;
}
