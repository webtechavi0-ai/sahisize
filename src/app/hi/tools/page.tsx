import type { Metadata } from 'next';
import ToolsIndex from '@/components/site/ToolsIndex';
import { buildMetadata } from '@/seo/metadata';
import { staticAlternates } from '@/seo/hreflang';

export const dynamic = 'force-static';

const TITLE = 'एग्ज़ाम फॉर्म के लिए फोटो, सिग्नेचर और PDF टूल | SahiSize';
const DESC =
  'फोटो को सही KB में कम्प्रेस करें, px या cm में रीसाइज़ करें, सिग्नेचर साफ़ करें, सर्टिफिकेट की एक PDF बनाएँ। फ्री, आपके फोन पर ही, कोई अपलोड नहीं।';

export function generateMetadata(): Metadata {
  return buildMetadata({
    title: TITLE,
    description: DESC,
    lang: 'hi',
    canonicalPath: '/hi/tools',
    alternates: staticAlternates('/tools'),
  });
}

export default function Page() {
  return <ToolsIndex lang="hi" title={TITLE} description={DESC} />;
}
