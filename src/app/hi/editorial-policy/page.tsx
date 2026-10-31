import EditorialPolicy from '@/components/site/EditorialPolicy';
import { buildMetadata } from '@/seo/metadata';

export const metadata = buildMetadata({
  title: 'संपादकीय नीति: एग्ज़ाम साइज़ कैसे जाँचते हैं | SahiSize',
  description:
    'SahiSize के फोटो और सिग्नेचर साइज़ कहाँ से आते हैं, कौन-से आधिकारिक नोटिस से पक्के हैं, हम इन्हें कैसे जाँचते हैं और गलती कैसे सुधारते हैं, यहाँ पढ़ें।',
  lang: 'hi',
  canonicalPath: '/hi/editorial-policy',
  alternates: { en: '/editorial-policy', hi: '/hi/editorial-policy' },
});

export default function Page() {
  return <EditorialPolicy lang="hi" />;
}
