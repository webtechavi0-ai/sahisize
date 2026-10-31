/**
 * Lazy WASM codecs (MozJPEG, squoosh PNG, libwebp, squoosh resize).
 *
 * jsquash locates its .wasm via `new URL(..., import.meta.url)`, which breaks under bundlers and
 * in Node, so we always compile the module ourselves (see wasm-source.ts) and hand it to the
 * emscripten / wasm-bindgen glue.
 *
 * JPEG output: baseline (SOF0, NOT progressive), 4:2:0 chroma, optimised Huffman, no trellis
 * multipass, no metadata except JFIF. These settings are part of the product contract.
 */
import { EngineError, type Bytes, type RasterImage } from '../types';
import { getWasmSource, type WasmName } from './wasm-source';

export type CodecKind = 'jpeg' | 'resize' | 'png' | 'webp' | 'jpeg-dec';

async function loadModule(name: WasmName): Promise<WebAssembly.Module> {
  if (typeof WebAssembly === 'undefined') {
    throw new EngineError('WASM_UNSUPPORTED', 'WebAssembly is not available');
  }
  try {
    return await getWasmSource().load(name);
  } catch (e) {
    if (e instanceof EngineError) throw e;
    // A CSP without 'wasm-unsafe-eval' (old Chrome) lands here too.
    throw new EngineError('WASM_UNSUPPORTED', `Could not load ${name}: ${String(e)}`);
  }
}

// ---------------------------------------------------------------------------
// Glue shapes
// ---------------------------------------------------------------------------

interface ImageDataLike {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}
interface MozEncModule {
  encode(data: ArrayBufferView, w: number, h: number, opts: MozJpegOptions): Uint8Array;
}
interface MozDecModule {
  decode(data: ArrayBufferView, preserveOrientation: boolean): ImageDataLike | null;
}
interface WebpEncModule {
  encode(data: ArrayBufferView, w: number, h: number, opts: WebpOptions): Uint8Array | null;
}
interface WebpDecModule {
  decode(data: ArrayBufferView): ImageDataLike | null;
}
interface PngModule {
  encode(data: Uint8Array, w: number, h: number, bitDepth: number): Uint8Array;
  decode(data: Uint8Array): ImageDataLike;
}
interface ResizeModule {
  resize(
    input: Uint8Array,
    iw: number,
    ih: number,
    ow: number,
    oh: number,
    method: number,
    premultiply: boolean,
    linearRGB: boolean,
  ): Uint8ClampedArray;
}

interface EmscriptenInit {
  noInitialRun: boolean;
  instantiateWasm(
    imports: WebAssembly.Imports,
    receive: (inst: WebAssembly.Instance, mod: WebAssembly.Module) => void,
  ): WebAssembly.Exports;
}
type EmscriptenFactory<T> = (init: EmscriptenInit) => Promise<T>;
type BindgenInit = (module: WebAssembly.Module) => Promise<unknown>;

function instantiateEmscripten<T>(factory: EmscriptenFactory<T>, mod: WebAssembly.Module): Promise<T> {
  return factory({
    noInitialRun: true,
    instantiateWasm(imports, receive) {
      const inst = new WebAssembly.Instance(mod, imports);
      receive(inst, mod);
      return inst.exports;
    },
  });
}

/** Memoise a loader; a failed load is forgotten so the next call retries. */
function lazy<T>(load: () => Promise<T>): () => Promise<T> {
  let p: Promise<T> | null = null;
  return () => {
    if (!p) {
      const attempt = load();
      p = attempt;
      attempt.catch(() => {
        if (p === attempt) p = null;
      });
    }
    return p;
  };
}

// The glue modules are untyped for our purposes (their d.ts describe a different init path), so
// each is narrowed to the shape above through `unknown` at this single boundary.
const getJpegEnc = lazy(async () => {
  const [glue, mod] = await Promise.all([import('@jsquash/jpeg/codec/enc/mozjpeg_enc.js'), loadModule('jpeg-enc')]);
  return instantiateEmscripten(glue.default as unknown as EmscriptenFactory<MozEncModule>, mod);
});

const getJpegDec = lazy(async () => {
  const [glue, mod] = await Promise.all([import('@jsquash/jpeg/codec/dec/mozjpeg_dec.js'), loadModule('jpeg-dec')]);
  return instantiateEmscripten(glue.default as unknown as EmscriptenFactory<MozDecModule>, mod);
});

const getWebpEnc = lazy(async () => {
  const [glue, mod] = await Promise.all([import('@jsquash/webp/codec/enc/webp_enc.js'), loadModule('webp-enc')]);
  return instantiateEmscripten(glue.default as unknown as EmscriptenFactory<WebpEncModule>, mod);
});

const getWebpDec = lazy(async () => {
  const [glue, mod] = await Promise.all([import('@jsquash/webp/codec/dec/webp_dec.js'), loadModule('webp-dec')]);
  return instantiateEmscripten(glue.default as unknown as EmscriptenFactory<WebpDecModule>, mod);
});

const getPng = lazy(async () => {
  const [glue, mod] = await Promise.all([import('@jsquash/png/codec/pkg/squoosh_png.js'), loadModule('png')]);
  await (glue.default as unknown as BindgenInit)(mod);
  return glue as unknown as PngModule;
});

const getResize = lazy(async () => {
  const [glue, mod] = await Promise.all([
    import('@jsquash/resize/lib/resize/pkg/squoosh_resize.js'),
    loadModule('resize'),
  ]);
  await (glue.default as unknown as BindgenInit)(mod);
  return glue as unknown as ResizeModule;
});

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface MozJpegOptions {
  quality: number;
  baseline: boolean;
  arithmetic: boolean;
  progressive: boolean;
  optimize_coding: boolean;
  smoothing: number;
  color_space: number;
  quant_table: number;
  trellis_multipass: boolean;
  trellis_opt_zero: boolean;
  trellis_opt_table: boolean;
  trellis_loops: number;
  auto_subsample: boolean;
  chroma_subsample: number;
  separate_chroma_quality: boolean;
  chroma_quality: number;
}

const clampQ = (q: number) => Math.max(1, Math.min(100, Math.round(q)));

/** MozJPEG options. Note `baseline: true` alone does NOT mean non-progressive. */
export function jpegOptions(quality: number): MozJpegOptions {
  return {
    quality: clampQ(quality),
    baseline: true,
    arithmetic: false,
    progressive: false,
    optimize_coding: true,
    smoothing: 0,
    color_space: 3, // YCbCr
    quant_table: 3,
    trellis_multipass: false,
    trellis_opt_zero: false,
    trellis_opt_table: false,
    trellis_loops: 1,
    auto_subsample: false,
    chroma_subsample: 2, // 4:2:0
    separate_chroma_quality: false,
    chroma_quality: 75,
  };
}

type WebpOptions = Record<string, number>;

function webpOptions(quality: number): WebpOptions {
  return {
    quality: clampQ(quality),
    target_size: 0,
    target_PSNR: 0,
    method: 4,
    sns_strength: 50,
    filter_strength: 60,
    filter_sharpness: 0,
    filter_type: 1,
    partitions: 0,
    segments: 4,
    pass: 1,
    show_compressed: 0,
    preprocessing: 0,
    autofilter: 0,
    partition_limit: 0,
    alpha_compression: 1,
    alpha_filtering: 1,
    alpha_quality: 100,
    lossless: 0,
    exact: 0,
    image_hint: 0,
    emulate_jpeg_size: 0,
    thread_level: 0,
    low_memory: 0,
    near_lossless: 100,
    use_delta_palette: 0,
    use_sharp_yuv: 0,
  };
}

// ---------------------------------------------------------------------------
// Public codec functions
// ---------------------------------------------------------------------------

/** Copy out of WASM memory into a fresh, exactly-sized ArrayBuffer. */
function toBytes(u: Uint8Array): Bytes {
  const out = new Uint8Array(u.length);
  out.set(u);
  return out;
}

function byteView(r: RasterImage): Uint8Array {
  return new Uint8Array(r.data.buffer, r.data.byteOffset, r.data.byteLength);
}

function toRaster(res: ImageDataLike): RasterImage {
  return { data: new Uint8ClampedArray(res.data), width: res.width, height: res.height };
}

/** Encode RGBA to baseline 4:2:0 JPEG with a JFIF APP0 only. Alpha is ignored. */
export async function encodeJpeg(r: RasterImage, quality: number): Promise<Bytes> {
  const m = await getJpegEnc();
  return toBytes(m.encode(r.data, r.width, r.height, jpegOptions(quality)));
}

/** Decode JPEG with MozJPEG. EXIF orientation is NOT applied (see core/exif.ts). */
export async function decodeJpeg(bytes: Uint8Array): Promise<RasterImage> {
  const res = (await getJpegDec()).decode(bytes, false);
  if (!res) throw new EngineError('DECODE_FAILED', 'JPEG decode failed');
  return toRaster(res);
}

export async function encodePng(r: RasterImage): Promise<Bytes> {
  return toBytes((await getPng()).encode(byteView(r), r.width, r.height, 8));
}

export async function decodePng(bytes: Uint8Array): Promise<RasterImage> {
  const res = (await getPng()).decode(bytes);
  if (!res) throw new EngineError('DECODE_FAILED', 'PNG decode failed');
  return toRaster(res);
}

export async function encodeWebp(r: RasterImage, quality: number): Promise<Bytes> {
  const res = (await getWebpEnc()).encode(r.data, r.width, r.height, webpOptions(quality));
  if (!res) throw new EngineError('INTERNAL', 'WebP encode failed');
  return toBytes(res);
}

export async function decodeWebp(bytes: Uint8Array): Promise<RasterImage> {
  const res = (await getWebpDec()).decode(bytes);
  if (!res) throw new EngineError('DECODE_FAILED', 'WebP decode failed');
  return toRaster(res);
}

/**
 * Lanczos3 via squoosh resize WASM, in sRGB space (like canvas, Pillow, Photoshop default):
 * linear-light made 12 MP reductions ~7× slower for no visible gain. Alpha is premultiplied
 * only when the image has transparency.
 */
export async function resizeLanczosWasm(r: RasterImage, w: number, h: number): Promise<RasterImage> {
  const m = await getResize();
  const view = byteView(r);
  let alpha = false;
  for (let p = 3; p < view.length; p += 4) {
    if (view[p]! < 255) {
      alpha = true;
      break;
    }
  }
  const out = m.resize(view, r.width, r.height, w, h, 3 /* lanczos3 */, alpha, false);
  return { data: new Uint8ClampedArray(out.buffer, out.byteOffset, out.byteLength), width: w, height: h };
}

/** Start fetching/compiling codecs. Never throws. */
export async function prewarmCodecs(kinds: readonly CodecKind[] = ['jpeg', 'resize']): Promise<void> {
  const loaders: Record<CodecKind, () => Promise<unknown>> = {
    jpeg: getJpegEnc,
    'jpeg-dec': getJpegDec,
    resize: getResize,
    png: getPng,
    webp: getWebpEnc,
  };
  await Promise.allSettled([...new Set(kinds)].map((k) => loaders[k]()));
}
