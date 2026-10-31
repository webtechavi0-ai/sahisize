/**
 * Internal protocol between api.ts (main thread) and worker/worker.ts. NOT a public contract:
 * UI code imports from api.ts / types.ts only.
 */
import type {
  Bytes,
  CleanupOptions,
  ConvertFormat,
  ConvertOptions,
  CropRect,
  DecodeOptions,
  DocSpec,
  EngineImage,
  FitOptions,
  FitResult,
  Flip,
  ImagesToPdfOptions,
  PhotoSheetOptions,
  PrewarmKind,
  PreviewOptions,
  PreviewResult,
  ProgressFn,
  RasterImage,
  ZipEntry,
} from '../types';

export interface WorkerCaps {
  offscreenCanvas: boolean;
  wasm: boolean;
}

/** Item for imagesToPdf after api.ts rasterised any PDFs on the main thread. */
export type PdfInputItem =
  | { kind: 'blob'; blob: Blob }
  | { kind: 'image'; img: EngineImage }
  | { kind: 'raster'; raster: RasterImage };

export interface AssembleOptions {
  maxKB: number;
  pageSizesPt: { w: number; h: number }[];
}

export interface WorkerApi {
  /** Tag every handle with the supervisor's generation. Called once, right after creation. */
  init(generation: number): void;
  caps(): WorkerCaps;
  decode(blob: Blob, opts?: DecodeOptions): Promise<EngineImage>;
  /** Main-thread decode fallback: adopt RGBA as a handle. */
  adoptRaster(raster: RasterImage): Promise<EngineImage>;
  resize(img: EngineImage, width: number, height: number): Promise<EngineImage>;
  crop(img: EngineImage, rect: CropRect, rotationDeg: number, flip: Flip): Promise<EngineImage>;
  cleanup(img: EngineImage, kind: 'signature' | 'thumb', opts: CleanupOptions): Promise<EngineImage>;
  /** `stripRaster`: name/date strip rendered on the main thread when the worker has no OffscreenCanvas. */
  fit(img: EngineImage, spec: DocSpec, opts?: FitOptions, stripRaster?: RasterImage): Promise<FitResult>;
  imagesToPdf(items: PdfInputItem[], opts: Omit<ImagesToPdfOptions, 'onProgress'>, onProgress?: ProgressFn): Promise<Bytes>;
  /**
   * compressPdf back end: rasterised pages (as rasters or adopted handles) are encoded and
   * assembled. Handles passed here are released afterwards. Throws PDF_IMPOSSIBLE.
   */
  assemblePdfFromRasters(pages: (RasterImage | EngineImage)[], opts: AssembleOptions): Promise<Bytes>;
  zip(files: ZipEntry[], readme?: string): Promise<Bytes>;
  prewarm(kinds?: PrewarmKind[]): Promise<void>;
  release(img: EngineImage): void;
  convert(img: EngineImage, format: ConvertFormat, opts?: ConvertOptions): Promise<Bytes>;
  photoSheet(img: EngineImage, opts: PhotoSheetOptions): Promise<Bytes>;
  preview(img: EngineImage, opts?: PreviewOptions): Promise<PreviewResult>;
}

/** Handle ids are `g<generation>-<seq>`. */
export function handleGeneration(id: string): number | null {
  const m = /^g(\d+)-\d+$/.exec(id);
  return m ? Number(m[1]) : null;
}
