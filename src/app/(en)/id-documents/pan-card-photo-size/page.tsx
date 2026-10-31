/** /id-documents/pan-card-photo-size */
import IdDocumentLayout, { idDocumentMetadata } from '@/components/layouts/IdDocumentLayout';
import IdPhotoTool from '@/islands/id-documents/IdPhotoTool';
import ToolContent from '@/components/tools/ToolContent';
import { toolDict } from '@/components/tools/dict';
import { getIdPage } from '@/config/id-documents';
import { panPhotoCopy } from '@/components/id-documents/copy';

const lang = 'en' as const;
const page = getIdPage('pan-card-photo-size');
const c = panPhotoCopy(lang);
const s = page.spec;

export const metadata = idDocumentMetadata({ lang, page, copy: c });

export default function Page() {
  return (
    <IdDocumentLayout lang={lang} page={page} copy={c} content={<ToolContent lang={lang} sections={c.sections} />}>
      <IdPhotoTool
        lang={lang}
        dict={toolDict(lang)}
        tool={page.slug}
        spec={s}
          target={`We will make it ${s.widthPx}×${s.heightPx} px (3.5×2.5 cm), JPG, under ${s.maxKB} KB.`}
          tip="Use a clear colour photo with a light background."
      />
    </IdDocumentLayout>
  );
}
