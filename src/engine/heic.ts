/**
 * HEIC/HEIF decode (SPEC 7.1): native first (Safari's createImageBitmap, handled in decode.ts),
 * then libheif-js (WASM bundle, ~2 MB, lazy-loaded only for HEIC on non-Safari browsers).
 * libheif applies the HEIF irot/imir transforms, so the result is upright.
 */
import { EngineError, type RasterImage } from './types';

interface HeifImage {
  get_width(): number;
  get_height(): number;
  display(target: { data: Uint8ClampedArray; width: number; height: number }, cb: (d: unknown) => void): void;
  free?(): void;
}
interface LibHeif {
  HeifDecoder: new () => { decode(data: Uint8Array): HeifImage[] };
  ready?: Promise<unknown>;
}

let lib: Promise<LibHeif> | null = null;

function loadLibheif(): Promise<LibHeif> {
  return (lib ??= (async () => {
    const mod = (await import('libheif-js/libheif-wasm/libheif-bundle.mjs')) as { default: () => LibHeif | Promise<LibHeif> };
    const inst = await mod.default();
    if (inst.ready) await inst.ready;
    return inst;
  })().catch((e) => {
    lib = null;
    throw e;
  }));
}

export async function decodeHeicWasm(bytes: Uint8Array): Promise<RasterImage> {
  let heif: LibHeif;
  try {
    heif = await loadLibheif();
  } catch (e) {
    throw new EngineError('DECODE_FAILED', `HEIC decoder failed to load: ${String(e)}`, { type: 'heic' });
  }
  let images: HeifImage[];
  try {
    images = new heif.HeifDecoder().decode(bytes);
  } catch (e) {
    throw new EngineError('DECODE_FAILED', `HEIC decode failed: ${String(e)}`, { type: 'heic' });
  }
  const img = images?.[0];
  if (!img) throw new EngineError('DECODE_FAILED', 'HEIC file has no image', { type: 'heic' });
  const width = img.get_width();
  const height = img.get_height();
  const data = new Uint8ClampedArray(width * height * 4);
  await new Promise<void>((resolve, reject) =>
    img.display({ data, width, height }, (d) => (d ? resolve() : reject(new EngineError('DECODE_FAILED', 'HEIC display failed', { type: 'heic' })))),
  );
  for (const im of images) im.free?.();
  return { data, width, height };
}
