/**
 * Slim, serialisable preset shape the KitFlow island receives as a prop.
 * Build it on the server with `toKitPreset(preset)` from ./kit-preset (never import
 * '@/content/presets' from island code: it bundles every preset).
 */
import type { DocSpec, LocalizedText } from '@/engine/types';

export interface KitDoc {
  /** docSlug(doc): storage key and file identity (Q7). */
  key: string;
  /** Engine DocSpec (toDocSpec). */
  spec: DocSpec;
  sizeNote?: LocalizedText;
  captureTip?: LocalizedText;
  variant?: 'dual-language' | 'triple' | null;
  optional?: boolean;
  appliesTo?: LocalizedText;
  disputed?: boolean;
}

export interface KitPreset {
  slug: string;
  name: LocalizedText;
  body: string;
  cycle: string;
  /** presetHash(preset): saved outputs are re-fitted when it changes (PLAN 3.9). */
  hash: string;
  liveCaptureAlso: boolean;
  photoUploadReplacedByLive: boolean;
  liveCaptureTips?: LocalizedText[];
  declarationText?: { en: string; hi?: string; toVerify?: boolean };
  /** Official notice the specs come from (ZIP README, SPEC 7.7). */
  source?: { notification: string; url: string; lastChecked: string };
  /** Fittable documents only (getKitDocuments), in preset order. */
  docs: KitDoc[];
}
