/** /hi/id-documents/pan-card-signature-size */
import IdDocumentLayout, { idDocumentMetadata } from '@/components/layouts/IdDocumentLayout';
import IdSignatureTool from '@/components/id-documents/IdSignatureTool';
import ToolContent from '@/components/tools/ToolContent';
import { toolDict } from '@/components/tools/dict';
import { getIdPage, getIdPageCopy, idSection } from '@/server/content';

const lang = 'hi' as const;
const page = getIdPage('pan-card-signature-size')!;
const c = getIdPageCopy(page.slug, lang)!;
const s = page.spec;
const checked = idSection().checkedLabel[lang];

export const metadata = idDocumentMetadata({ lang, page, copy: c });

export default function Page() {
  return (
    <IdDocumentLayout
      lang={lang}
      page={page}
      copy={c}
      content={<ToolContent lang={lang} sections={c.sections} />}
    >
      <IdSignatureTool
        lang={lang}
        dict={toolDict(lang)}
        tool={page.slug}
        spec={s}
        label={`${s.widthPx}×${s.heightPx} px (2×4.5 cm), ${s.maxKB} KB से कम, ${s.dpi} DPI`}
        sub={`Protean (NSDL) पैन गाइडलाइन, ${checked}`}
        tip="सादे सफेद कागज़ पर गहरे पेन से साइन करें।"
      />
    </IdDocumentLayout>
  );
}
