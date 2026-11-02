/**
 * Turn an ExamPreset into the slim, serialisable KitPreset prop for <KitFlow>. Uses only the
 * client-safe preset helpers, so the registry is never bundled into the browser.
 *
 *   <KitFlow preset={toKitPreset(preset)} lang={lang} dict={getNamespace(lang, 'common', 'ui', 'kit')} />
 */
import { docSlug, kitDocuments, presetHash, toDocSpec, type ExamPreset } from '@/lib/presets';
import type { KitDoc, KitPreset } from './kit-types';

export function toKitPreset(p: ExamPreset): KitPreset {
  const docs: KitDoc[] = kitDocuments(p).map((d) => {
    const k: KitDoc = { key: docSlug(d), spec: toDocSpec(d) };
    if (d.sizeNote) k.sizeNote = d.sizeNote;
    if (d.captureTip) k.captureTip = d.captureTip;
    if (d.variant) k.variant = d.variant;
    if (d.optional) k.optional = d.optional;
    if (d.appliesTo) k.appliesTo = d.appliesTo;
    if (d.disputed) k.disputed = d.disputed;
    return k;
  });
  const out: KitPreset = {
    slug: p.slug,
    name: p.name,
    body: p.body,
    cycle: p.cycle,
    hash: presetHash(p),
    liveCaptureAlso: p.liveCaptureAlso,
    photoUploadReplacedByLive: p.photoUploadReplacedByLive,
    docs,
    source: { notification: p.notification, url: p.sourceUrl, lastChecked: p.lastChecked },
  };
  if (p.liveCaptureTips?.length) out.liveCaptureTips = p.liveCaptureTips;
  if (p.declarationText) out.declarationText = p.declarationText;
  return out;
}
