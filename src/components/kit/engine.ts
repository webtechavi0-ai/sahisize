/**
 * Lazy engine loader (SPEC 13: engine loads only when the user picks a file).
 * Island code must reach the engine only through this, so `@/engine/api` (comlink +
 * the worker URL) stays out of the initial bundle. Tests mock '@/engine/api'.
 */
import type * as EngineApiModule from '@/engine/api';

type EngineModule = typeof EngineApiModule;

let mod: Promise<EngineModule> | null = null;

export function loadEngine(): Promise<EngineModule> {
  if (!mod) {
    mod = import('@/engine/api');
    mod.catch(() => {
      mod = null;
    });
  }
  return mod;
}

/** Start WASM fetch/compile early (pointerenter/focus on the uploader). Never throws. */
export function prewarmEngine(): void {
  loadEngine()
    .then((e) => e.prewarm())
    .catch(() => {});
}
