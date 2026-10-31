/**
 * Lazy engine loader for UI code. Importing this module costs nothing: `@/engine/api` (Comlink,
 * the worker URL, pdfjs glue) is fetched only when a tool actually needs the engine.
 *
 *   import { loadEngine, prewarmEngine } from '@/engine/client';
 *   <input onPointerEnter={prewarmEngine} onFocus={prewarmEngine} … />
 *   const engine = await loadEngine();
 *   const img = await engine.decode(file);
 *
 * Tests can replace the module with `vi.mock('@/engine/api', …)`.
 */
import type * as EngineApiModule from './api';
import type { PrewarmKind } from './types';

export type EngineModule = typeof EngineApiModule;

let modulePromise: Promise<EngineModule> | null = null;

/** Load (once) and return the engine API module. A failed chunk load is retried next time. */
export function loadEngine(): Promise<EngineModule> {
  if (!modulePromise) {
    const attempt = import('./api');
    modulePromise = attempt;
    attempt.catch(() => {
      if (modulePromise === attempt) modulePromise = null;
    });
  }
  return modulePromise;
}

/** True once the API module has been requested (it may still be loading). */
export function isEngineRequested(): boolean {
  return modulePromise !== null;
}

/**
 * Start loading the API module and warming the WASM codecs (pointerenter / focus on an
 * uploader). Never throws; no-op during server rendering.
 */
export function prewarmEngine(kinds?: PrewarmKind[]): void {
  if (typeof window === 'undefined') return;
  loadEngine()
    .then((engine) => engine.prewarm(kinds))
    .catch(() => {});
}
