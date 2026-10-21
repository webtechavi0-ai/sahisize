/**
 * SERVER-ONLY: the dictionary a tool island receives as a prop. Only the namespaces the
 * tools use: common, ui, tool, and the parts of kit that the shared Cropper, warnings and
 * the declaration trace sheet read (keeps page HTML small).
 */
import { getNamespace, type Dict } from '@/i18n';
import type { Lang } from '@/config/site';

export function toolDict(lang: Lang): Dict {
  const d = getNamespace(lang, 'common', 'ui', 'kit', 'tool');
  const kit = d.kit as Dict;
  const result = (kit.result as Dict | undefined) ?? {};
  d.kit = {
    crop: kit.crop ?? {},
    declaration: kit.declaration ?? {},
    result: { warnings: (result.warnings as Dict | undefined) ?? {} },
  };
  return d;
}
