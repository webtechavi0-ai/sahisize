/**
 * SERVER-ONLY: the dictionary a tool widget receives as a prop. Only the namespaces the
 * tools use: common, ui, tool, and the parts of kit that the shared Cropper, warnings and
 * the declaration trace sheet read (keeps page HTML small).
 */
import 'server-only';
import type { Lang } from '@/i18n/config';
import type { Dict } from '@/i18n/core';
import { getMessages } from '@/i18n/server';

export function toolDict(lang: Lang): Dict {
  const { kit, ...rest } = getMessages(lang, ['common', 'ui', 'kit', 'tool']);
  const k = (kit ?? {}) as Dict;
  const result = (k.result as Dict | undefined) ?? {};
  return {
    ...(rest as Dict),
    kit: {
      crop: k.crop ?? {},
      declaration: k.declaration ?? {},
      result: { warnings: (result.warnings as Dict | undefined) ?? {} },
    },
  };
}
