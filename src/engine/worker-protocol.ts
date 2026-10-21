/**
 * Internal protocol between src/engine/api.ts (main thread) and
 * src/engine/worker.ts. Owned by Workstream A; NOT a frozen contract.
 * UI code must import from api.ts / types.ts only.
 */
import type {
  CleanupOptions,
  ConvertOptions,
  ConvertFormat,
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
  Bytes,
} from './types';

export interface WorkerCaps {
  offscreenCanvas: boolean;
  wasm: boolean;
}

/** Item for imagesToPdf after api.ts rasterised any PDFs on the main thread. */
export type PdfInputItem =
  | { kind: 'blob'; blob: Blob }
  | { kind: 'image'; img: EngineImage }
  | { kind: 'raster'; raster: RasterImage };

export interface WorkerApi {
  caps(): Promise<WorkerCaps>;
  decode(blob: Blob, opts?: DecodeOptions): Promise<EngineImage>;
  /** Main-thread decode fallback (no OffscreenCanvas in the worker): adopt RGBA as a handle. */
  adoptRaster(raster: RasterImage): Promise<EngineImage>;
  /** decodePdfPages: api.ts rasterises with pdfjs on the main thread, the worker adopts the pages. */
  adoptRasters(rasters: RasterImage[]): Promise<EngineImage[]>;
  resize(img: EngineImage, width: number, height: number): Promise<EngineImage>;
  crop(img: EngineImage, rect: CropRect, rotationDeg: number, flip: Flip): Promise<EngineImage>;
  cleanup(
    img: EngineImage,
    kind: 'signature' | 'thumb',
    opts: CleanupOptions,
  ): Promise<EngineImage>;
  /** `stripRaster`: name/date strip rendered on the main thread when the worker has no OffscreenCanvas. */
  fit(
    img: EngineImage,
    spec: DocSpec,
    opts?: FitOptions,
    stripRaster?: RasterImage,
  ): Promise<FitResult>;
  imagesToPdf(
    items: PdfInputItem[],
    opts: Omit<ImagesToPdfOptions, 'onProgress'>,
    onProgress?: ProgressFn,
  ): Promise<Bytes>;
  /** compressPdf: api.ts rasterises with pdfjs (main thread); the worker encodes and assembles. */
  assemblePdfFromRasters(
    pages: RasterImage[],
    opts: { maxKB: number; pageSizesPt: { w: number; h: number }[] },
  ): Promise<Bytes>;
  zip(files: ZipEntry[], readme?: string): Promise<Bytes>;
  prewarm(kinds?: PrewarmKind[]): Promise<void>;
  release(img: EngineImage): Promise<void>;
  convert(img: EngineImage, format: ConvertFormat, opts?: ConvertOptions): Promise<Bytes>;
  photoSheet(img: EngineImage, opts: PhotoSheetOptions): Promise<Bytes>;
  preview(img: EngineImage, opts?: PreviewOptions): Promise<PreviewResult>;
}
