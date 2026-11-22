/**
 * UI strings for the exam-document template blocks added for SEO (answer box, next step,
 * related links). Kept here until they move to `site.doc.*` in src/i18n/messages (owner D
 * namespace; the shared message files are edited by the orchestrator).
 */
import type { Lang } from '@/i18n/config';
import type { AnswerKey } from './logic';

interface DocCopy {
  answerTitle: (short: string, doc: string) => string;
  rows: Record<AnswerKey | 'source', string>;
  source: (notification: string, page: number | null, checked: string) => string;
  sourceLink: string;
  introTail: string;
  introTailToVerify: string;
  nextTitle: string;
  nextDoc: (doc: string, exam: string) => string;
  sameFile: string;
  related: string;
  guide: string;
  howTo: { upload: (doc: string) => string; crop: string; fit: (spec: string) => string; download: (file: string) => string; names: [string, string, string, string] };
}

const en: DocCopy = {
  answerTitle: (short, doc) => `${short} ${doc} size at a glance`,
  rows: { size: 'Size', format: 'Format', pixels: 'Pixels', pages: 'Pages', who: 'Who uploads', source: 'Source' },
  source: (n, page, checked) => `${n}${page ? `, page ${page}` : ''} · checked ${checked}`,
  sourceLink: 'Open the notice',
  introTail: 'Add yours below and we make it exactly right, on your phone.',
  introTailToVerify: 'Check the form field before you upload.',
  nextTitle: 'Next step',
  nextDoc: (doc, exam) => `Next: ${doc} for ${exam}`,
  sameFile: 'Same file works for:',
  related: 'Related pages',
  guide: 'Guide',
  howTo: {
    upload: (doc) => `Take a photo of your ${doc} or choose one from the gallery.`,
    crop: 'Crop inside the guide box. The box is locked to the right shape.',
    fit: (spec) => `Auto-fit makes it ${spec}.`,
    download: (file) => `Download ${file} when every rule shows a tick.`,
    names: ['Upload', 'Crop', 'Auto-fit', 'Download'],
  },
};

const hi: DocCopy = {
  answerTitle: (short, doc) => `${short} ${doc} साइज़ एक नज़र में`,
  rows: { size: 'साइज़', format: 'फॉर्मेट', pixels: 'पिक्सल', pages: 'पेज', who: 'कौन अपलोड करे', source: 'सोर्स' },
  source: (n, page, checked) => `${n}${page ? `, पेज ${page}` : ''} · जाँच ${checked}`,
  sourceLink: 'नोटिस खोलें',
  introTail: 'नीचे अपनी फाइल जोड़ें, Auto-fit आपके फोन पर ही इसे बिल्कुल सही बनाता है।',
  introTailToVerify: 'अपलोड से पहले फॉर्म में देख लें।',
  nextTitle: 'अगला कदम',
  nextDoc: (doc, exam) => `अगला: ${exam} का ${doc}`,
  sameFile: 'यही फाइल इनमें भी चलेगी:',
  related: 'ये भी देखें',
  guide: 'गाइड',
  howTo: {
    upload: (doc) => `अपने ${doc} की फोटो लें या गैलरी से चुनें।`,
    crop: 'गाइड बॉक्स के अंदर क्रॉप करें। बॉक्स सही आकार में लॉक है।',
    fit: (spec) => `Auto-fit इसे ${spec} बनाता है।`,
    download: (file) => `हर नियम पर टिक दिखे तो ${file} डाउनलोड करें।`,
    names: ['अपलोड', 'क्रॉप', 'Auto-fit', 'डाउनलोड'],
  },
};

export function docCopy(lang: Lang): DocCopy {
  return lang === 'hi' ? hi : en;
}
