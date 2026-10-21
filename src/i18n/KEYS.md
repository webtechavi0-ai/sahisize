# i18n keys (★ frozen conventions)

Shared by every workstream. Source of truth for how UI strings are named and where they live
(SPEC 12.3, PLAN 3.11, QUESTIONS Q6).

## Files and owners

| Prefix | File(s) | Owner |
|---|---|---|
| `common.*` | `src/i18n/en.json`, `src/i18n/hi.json` | Phase 1. **Frozen** (key set); G may edit `hi.json` values only |
| `ui.*` | `src/i18n/ns/ui.{en,hi}.json` | B (UI primitives) |
| `kit.*` | `src/i18n/ns/kit.{en,hi}.json` | B (kit flow) |
| `site.*` (incl. `site.seo.*`) | `src/i18n/ns/site.{en,hi}.json` | C |
| `tool.*` | `src/i18n/ns/tool.{en,hi}.json` | F |
| `guide.*` | `src/i18n/ns/guide.{en,hi}.json` | E |

From Phase 3, G owns every `*.hi.json` value. Nobody edits another owner's file; ask the
orchestrator if you need a key in someone else's namespace.

## Rules

1. **Root = namespace.** Each file's root object has exactly one key, its namespace:
   `ui.en.json` is `{ "ui": { ... } }`. (`en.json`/`hi.json` → `{ "common": { ... } }`.)
2. **Dot paths in lowerCamel**: `kit.upload.takePhoto`, `tool.compressImage.name`.
   Group by screen or component, then element: `kit.result.passCheckTitle`.
   Engine error codes are the only UPPER_CASE keys (`common.errors.TOO_DETAILED`).
3. **Interpolation** uses `{var}`: `"Photo {sizeKB} KB hai. {exam} ko {min}–{max} KB chahiye."`
   Pass numbers already formatted for display. Hindi may use a subset of the English placeholders,
   never new ones.
4. **No HTML in values.** Put links/emphasis in the component; split the string if needed.
5. **English first.** A new key must exist in `*.en.json` before it is added to `*.hi.json`.
   A key only in Hindi fails CI; a key missing in Hindi warns and falls back to English.
6. **Voice** (SPEC 3.1): short, friendly, name the actual numbers. Hindi values may be Hinglish
   where natural ("Auto-fit dabayein"); use Devanagari for Hindi pages and keep KB/px/DPI/JPG in Latin.
7. **Don't reuse keys across meanings.** Two buttons that say "Next" today but may diverge get two keys.
   Generic verbs live in `common.actions.*`.
8. `npm run i18n:check` (scripts/i18n-check.ts) enforces 1, 2, 4 and 5 in CI.

## Using strings

Astro pages / build-time code:

```ts
import { t, useTranslations, getLangFromUrl, localizePath } from '@/i18n';
const lang = getLangFromUrl(Astro.url);
const tr = useTranslations(lang);
tr('common.actions.next');
t(lang, 'common.errors.TOO_LARGE_INPUT', { sizeMB: 31.2, maxMB: 25 });
localizePath('/exam/ibps-po', 'hi'); // "/hi/exam/ibps-po"
```

Islands (never import `@/i18n` – it bundles every string):

```astro
<KitFlow client:visible dict={getNamespace(lang, 'common', 'kit', 'ui')} lang={lang} />
```

```ts
import { createT, type Dict } from '@/i18n/core';
const t = createT(props.dict); // Hindi already merged over English by getNamespace
t('kit.upload.takePhoto');
```

Engine error messages: `t(lang, \`common.errors.${err.code}\`, err.details)`.

## `common.*` keys (Phase 1)

| Key | English |
|---|---|
| `common.siteName` | SahiSize |
| `common.tagline` | Right size, first time. |
| `common.trustLine` | Processed on your device. Never uploaded. |
| `common.notAffiliated` | Not affiliated with any government body. |
| `common.skipToContent`, `common.loading` | |
| `common.actions.{upload,takePhoto,chooseFromGallery,autoFit,next,back,download,downloadAll,share,startOver,cancel,confirm,retry,close,search}` | button labels |
| `common.docTypes.{photo,signature,thumb,declaration,certificate,other}` | document type names (match `DocType`) |
| `common.status.{todo,inProgress,done,pass,fail,toVerify}` | `toVerify` = "Size to verify" (Q15) |
| `common.checks.{dims,size,size1000,format,baseline,dpi,background}` | pass-check row labels (match `FitCheckRule`) |
| `common.checks.actualVsRequired` | `{actual} (needs {required})` |
| `common.units.{kb,kbRange,kbMax,px,dpi,cm}` | `{n} KB`, `{min}–{max} KB`, `up to {max} KB`, `{w}×{h} px`, `{n} DPI`, `{w}×{h} cm` |
| `common.errors.{TOO_DETAILED,TOO_PLAIN,DECODE_FAILED,TOO_LARGE_INPUT,UNSUPPORTED_TYPE,PDF_IMPOSSIBLE,ALREADY_SMALL,PDF_TEXT_ONLY,WASM_UNSUPPORTED,PDF_ENCRYPTED,SPEC_INCOMPLETE,OUT_OF_MEMORY,CANCELLED,INTERNAL,NOT_IMPLEMENTED,UNKNOWN}` | match `EngineErrorCode`; vars from `EngineError.details` |
| `common.lang.{en,hi,switchTo}` | |
| `common.theme.{toggle,light,dark,system}` | |
