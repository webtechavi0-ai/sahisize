/** Types for scripts/images/lib.mjs (used by the vitest suite under src/components/media). */
import type {
  GeneratedImages,
  ImageManifest,
  ImageSlot,
} from '../../src/components/media/image-schema';

export declare const ROOT: string;
export declare const MANIFEST_PATH: string;
export declare const GENERATED_PATH: string;
export declare const SOURCE_DIR: string;
export declare const PUBLIC_IMG_DIR: string;
export declare const OPENAI_IMAGES_URL: string;
export declare const DEFAULT_IMAGE_MODEL: string;
export declare const RENDITION_FILE: RegExp;

export type Quality = 'low' | 'medium' | 'high';

export interface CliArgs {
  only: string[];
  force: boolean;
  dryRun: boolean;
  quality: Quality | undefined;
}

export interface GenerationRequest {
  model: string;
  prompt: string;
  n: 1;
  size: ImageSlot['generation']['size'];
  quality: Quality;
  background: ImageSlot['generation']['background'];
  output_format: 'png';
}

export type Settled<T> = { status: 'fulfilled'; value: T } | { status: 'rejected'; reason: unknown };

export interface CheckFs {
  exists(absPath: string): boolean;
  listPublicImg(): string[];
}

export declare function formatZodError(err: { issues: { path: (string | number)[]; message: string }[] }): string;
export declare function loadManifest(path?: string): ImageManifest;
export declare function loadGenerated(path?: string): GeneratedImages;
export declare function sourcePath(id: string, dir?: string): string;
export declare function parseArgs(argv: string[], known?: string[]): CliArgs;
export declare function selectSlots(manifest: ImageManifest, only: string[]): ImageSlot[];
export declare function buildGenerationRequest(
  manifest: ImageManifest,
  slot: ImageSlot,
  opts?: { model?: string; quality?: Quality },
): GenerationRequest;
export declare function isRetryableStatus(status: number): boolean;
export declare function backoffMs(
  attempt: number,
  retryAfter?: string | null,
  opts?: { baseMs?: number; maxMs?: number; random?: () => number },
): number;
export declare function mapPool<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<Settled<R>[]>;
export declare function renditionName(id: string, width: number, hash: string, ext: 'avif' | 'webp'): string;
export declare function renditionPattern(id: string): RegExp;
export declare function stableStringify(value: unknown): string;
export declare function heightFor(width: number, aspect: string): number;
export declare function checkImages(input: {
  manifest: ImageManifest;
  generated: GeneratedImages;
  fs: CheckFs;
  routes: Set<string> | null;
  sourceDir?: string;
  publicImgDir: string;
}): { errors: string[]; warnings: string[] };
export declare function loadRoutes(): Set<string> | null;
