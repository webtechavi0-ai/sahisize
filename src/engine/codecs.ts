/**
 * Lazy WASM codec loaders behind a `WasmSource` adapter (PLAN 1.6 #1).
 *
 * jsquash locates its `.wasm` with `new URL(..., import.meta.url)` + fetch, which breaks in
 * Node (file: URLs) and under Vite pre-bundling. We therefore always compile the module
 * ourselves and hand it to the emscripten / wasm-bindgen glue:
 *  - Browser / worker: `codecs-browser.ts` (Vite `?url` imports + compileStreaming).
 *  - Node (tests, corpus script): `codecs-node.ts` (fs.readFileSync), installed via
 *    `setWasmSource()` in tests/engine/setup.ts.
 *
 * Encoder settings follow SPEC 7.3 + PLAN 1.6 #4: baseline (SOF0, NOT progressive),
 * 4:2:0 chroma, optimised Huffman, no trellis multipass, no metadata except JFIF.
 */
import { EngineError, type RasterImage } from './types';

export type WasmName = 'jpeg-enc' | 'jpeg-dec' | 'png' | 'webp-enc' | 'webp-dec' | 'resize';

export interface WasmSource {
  load(name: WasmName): Promise<WebAssembly.Module>;
}

let source: WasmSource | null = null;

/** Install a WASM source (Node tests). Resets every loaded codec. */
export function setWasmSource(s: WasmSource): void {
  source = s;
  jpegEnc = jpegDec = png = webpEnc = webpDec = resizeMod = null;
}

async function getSource(): Promise<WasmSource> {
  if (!source) {
    const m = await import('./codecs-browser');
    source = m.browserWasmSource;
  }
  return source;
}

async function loadModule(name: WasmName): Promise<WebAssembly.Module> {
  if (typeof WebAssembly === 'undefined') {
    throw new EngineError('WASM_UNSUPPORTED', 'WebAssembly is not available');
  }
  try {
    return await (await getSource()).load(name);
  } catch (e) {
    if (e instanceof EngineError) throw e;
    // CSP without 'wasm-unsafe-eval' (Chrome < 97) lands here (Q10).
    throw new EngineError('WASM_UNSUPPORTED', `Could not load ${name}: ${String(e)}`);
  }
}

// ---------------------------------------------------------------------------
// Emscripten glue (mozjpeg, webp)
// ---------------------------------------------------------------------------

type EmscriptenFactory<T> = (opts: Record<string, unknown>) => Promise<T>;

function instantiateEmscripten<T>(factory: EmscriptenFactory<T>, mod: WebAssembly.Module): Promise<T> {
  return factory({
    noInitialRun: true,
    instantiateWasm: (
      imports: WebAssembly.Imports,
      receive: (inst: WebAssembly.Instance, mod: WebAssembly.Module) => void,
    ) => {
      const inst = new WebAssembly.Instance(mod, imports);
      receive(inst, mod);
      return inst.exports;
    },
  });
}

interface MozEncModule {
  encode(data: ArrayBufferView, w: number, h: number, opts: Record<string, unknown>): Uint8Array;
}
interface MozDecModule {
  decode(data: ArrayBufferView, preserveOrientation: boolean): ImageDataLike | null;
}
interface WebpEncModule {
  encode(data: ArrayBufferView, w: number, h: number, opts: Record<string, unknown>): Uint8Array | null;
}
interface WebpDecModule {
  decode(data: ArrayBufferView): ImageDataLike | null;
}
interface ImageDataLike {
  data: Uint8ClampedArray;
  width: number;
  height: number;
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

let jpegEnc: Promise<MozEncModule> | null = null;
let jpegDec: Promise<MozDecModule> | null = null;
let png: Promise<PngModule> | null = null;
let webpEnc: Promise<WebpEncModule> | null = null;
let webpDec: Promise<WebpDecModule> | null = null;
let resizeMod: Promise<ResizeModule> | null = null;

function once<T>(p: Promise<T>, reset: () => void): Promise<T> {
  p.catch(reset);
  return p;
}

function getJpegEnc(): Promise<MozEncModule> {
  return (jpegEnc ??= once(
    (async () => {
      const [{ default: factory }, mod] = await Promise.all([
        import('@jsquash/jpeg/codec/enc/mozjpeg_enc.js'),
        loadModule('jpeg-enc'),
      ]);
      return instantiateEmscripten(factory as unknown as EmscriptenFactory<MozEncModule>, mod);
    })(),
    () => (jpegEnc = null),
  ));
}

function getJpegDec(): Promise<MozDecModule> {
  return (jpegDec ??= once(
    (async () => {
      const [{ default: factory }, mod] = await Promise.all([
        import('@jsquash/jpeg/codec/dec/mozjpeg_dec.js'),
        loadModule('jpeg-dec'),
      ]);
      return instantiateEmscripten(factory as unknown as EmscriptenFactory<MozDecModule>, mod);
    })(),
    () => (jpegDec = null),
  ));
}

function getWebpEnc(): Promise<WebpEncModule> {
  return (webpEnc ??= once(
    (async () => {
      const [{ default: factory }, mod] = await Promise.all([
        import('@jsquash/webp/codec/enc/webp_enc.js'),
        loadModule('webp-enc'),
      ]);
      return instantiateEmscripten(factory as unknown as EmscriptenFactory<WebpEncModule>, mod);
    })(),
    () => (webpEnc = null),
  ));
}

function getWebpDec(): Promise<WebpDecModule> {
  return (webpDec ??= once(
    (async () => {
      const [{ default: factory }, mod] = await Promise.all([
        import('@jsquash/webp/codec/dec/webp_dec.js'),
        loadModule('webp-dec'),
      ]);
      return instantiateEmscripten(factory as unknown as EmscriptenFactory<WebpDecModule>, mod);
    })(),
    () => (webpDec = null),
  ));
}

function getPng(): Promise<PngModule> {
  return (png ??= once(
    (async () => {
      const [glue, mod] = await Promise.all([
        import('@jsquash/png/codec/pkg/squoosh_png.js'),
        loadModule('png'),
      ]);
      await (glue.default as unknown as (m: unknown) => Promise<unknown>)(mod);
      return glue as unknown as PngModule;
    })(),
    () => (png = null),
  ));
}

function getResize(): Promise<ResizeModule> {
  return (resizeMod ??= once(
    (async () => {
      const [glue, mod] = await Promise.all([
        import('@jsquash/resize/lib/resize/pkg/squoosh_resize.js'),
        loadModule('resize'),
      ]);
      await (glue.default as unknown as (m: unknown) => Promise<unknown>)(mod);
      return glue as unknown as ResizeModule;
    })(),
    () => (resizeMod = null),
  ));
}

// ---------------------------------------------------------------------------
// Public codec functions
// ---------------------------------------------------------------------------

/** MozJPEG options (PLAN 1.6 #4). `baseline: true` alone does NOT mean non-progressive. */
export function jpegOptions(quality: number): Record<string, unknown> {
  return {
    quality: Math.max(1, Math.min(100, Math.round(quality))),
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

function toBytes(u: Uint8Array): Uint8Array<ArrayBuffer> {
  // Copy out of WASM memory into a fresh, exactly-sized ArrayBuffer.
  const out = new Uint8Array(u.length);
  out.set(u);
  return out;
}

/** Encode RGBA to baseline 4:2:0 JPEG with a JFIF APP0 only. Alpha is ignored. */
export async function encodeJpeg(r: RasterImage, quality: number): Promise<Uint8Array<ArrayBuffer>> {
  const m = await getJpegEnc();
  return toBytes(m.encode(r.data, r.width, r.height, jpegOptions(quality)));
}

/** Decode JPEG with mozjpeg. EXIF orientation is NOT applied (see exif.ts). */
export async function decodeJpeg(bytes: Uint8Array): Promise<RasterImage> {
  const m = await getJpegDec();
  const res = m.decode(bytes, false);
  if (!res) throw new EngineError('DECODE_FAILED', 'JPEG decode failed');
  return { data: new Uint8ClampedArray(res.data), width: res.width, height: res.height };
}

export async function encodePng(r: RasterImage): Promise<Uint8Array<ArrayBuffer>> {
  const m = await getPng();
  const view = new Uint8Array(r.data.buffer, r.data.byteOffset, r.data.byteLength);
  return toBytes(m.encode(view, r.width, r.height, 8));
}

export async function decodePng(bytes: Uint8Array): Promise<RasterImage> {
  const m = await getPng();
  const res = m.decode(bytes);
  if (!res) throw new EngineError('DECODE_FAILED', 'PNG decode failed');
  return { data: new Uint8ClampedArray(res.data), width: res.width, height: res.height };
}

export async function encodeWebp(r: RasterImage, quality: number): Promise<Uint8Array<ArrayBuffer>> {
  const m = await getWebpEnc();
  const res = m.encode(r.data, r.width, r.height, {
    quality: Math.max(1, Math.min(100, Math.round(quality))),
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
  });
  if (!res) throw new EngineError('INTERNAL', 'WebP encode failed');
  return toBytes(res);
}

export async function decodeWebp(bytes: Uint8Array): Promise<RasterImage> {
  const m = await getWebpDec();
  const res = m.decode(bytes);
  if (!res) throw new EngineError('DECODE_FAILED', 'WebP decode failed');
  return { data: new Uint8ClampedArray(res.data), width: res.width, height: res.height };
}

/**
 * Lanczos3 via squoosh resize WASM. Resamples in sRGB space (like canvas, Pillow, Photoshop
 * default): linear-light conversion made 12 MP reductions ~7× slower for no visible gain on
 * photos. Alpha is premultiplied only when the image has transparency.
 */
export async function resizeLanczosWasm(r: RasterImage, w: number, h: number): Promise<RasterImage> {
  const m = await getResize();
  const view = new Uint8Array(r.data.buffer, r.data.byteOffset, r.data.byteLength);
  let alpha = false;
  for (let p = 3; p < view.length; p += 4) if (view[p]! < 255) { alpha = true; break; }
  const out = m.resize(view, r.width, r.height, w, h, 3 /* lanczos3 */, alpha, false);
  return { data: new Uint8ClampedArray(out.buffer, out.byteOffset, out.byteLength), width: w, height: h };
}

export type CodecKind = 'jpeg' | 'resize' | 'png' | 'webp' | 'jpeg-dec';

/** Start fetching/compiling codecs. Never throws. */
export async function prewarmCodecs(kinds: CodecKind[] = ['jpeg', 'resize']): Promise<void> {
  const tasks: Promise<unknown>[] = [];
  for (const k of kinds) {
    if (k === 'jpeg') tasks.push(getJpegEnc());
    if (k === 'jpeg-dec') tasks.push(getJpegDec());
    if (k === 'resize') tasks.push(getResize());
    if (k === 'png') tasks.push(getPng());
    if (k === 'webp') tasks.push(getWebpEnc());
  }
  await Promise.allSettled(tasks);
}
