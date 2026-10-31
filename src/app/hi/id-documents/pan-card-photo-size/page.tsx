/** /hi/id-documents/pan-card-photo-size */
import IdDocumentLayout, { idDocumentMetadata } from '@/components/layouts/IdDocumentLayout';
import IdPhotoTool from '@/islands/id-documents/IdPhotoTool';
import ToolContent from '@/components/tools/ToolContent';
import { toolDict } from '@/components/tools/dict';
import { getIdPage } from '@/config/id-documents';
import { panPhotoCopy } from '@/components/id-documents/copy';

const lang = 'hi' as const;
const page = getIdPage('pan-card-photo-size');
const c = panPhotoCopy(lang);
const s = page.spec;

export const metadata = idDocumentMetadata({ lang, page, copy: c });

export default function Page() {
  return (
    <IdDocumentLayout lang={lang} page={page} copy={c} content={<ToolContent sections={c.sections} />}>
      <IdPhotoTool
        lang={lang}
        dict={toolDict(lang)}
        tool={page.slug}
        spec={s}
          target={`हम इसे ${s.widthPx}×${s.heightPx} px (3.5×2.5 cm), JPG, ${s.maxKB} KB से कम बना देंगे।`}
          tip="हल्के बैकग्राउंड वाली साफ़ रंगीन फोटो लें।"
      />
    </IdDocumentLayout>
  );
}
