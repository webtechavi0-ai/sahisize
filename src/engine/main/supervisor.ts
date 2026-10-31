/**
 * Worker supervisor (main thread). Owns one worker at a time and every call in flight to it:
 *  - lazily spawns the worker, tagging it with a generation number;
 *  - tracks pending calls; when the worker crashes ('error' / 'messageerror') all of them reject
 *    with EngineError('WORKER_CRASHED') and the next call spawns a fresh worker;
 *  - per-call timeout (the worker is presumed hung and restarted) and AbortSignal support;
 *  - rejects handles from an older generation with STALE_HANDLE instead of a confusing failure;
 *  - notifies `onReset` listeners so the UI can drop handles it holds.
 *
 * Framework- and Comlink-agnostic: `spawn` is injected, so tests drive it with a fake worker.
 */
import { DEFAULT_CALL_TIMEOUT_MS } from '../limits';
import { EngineError, type EngineCallOptions, type EngineImage, type EngineResetReason } from '../types';
import { handleGeneration } from '../worker/protocol';

export interface SpawnedWorker<R> {
  remote: R;
  terminate(): void;
  /** Register the crash callback ('error' / 'messageerror' on the Worker). */
  onCrash(cb: (detail: string) => void): void;
}

export interface SupervisorOptions<R> {
  spawn(generation: number): SpawnedWorker<R>;
  defaultTimeoutMs?: number;
}

export interface CallSpec<T> extends EngineCallOptions {
  /** Handles the call reads; checked for staleness before anything is sent. */
  handles?: readonly EngineImage[];
  /** Called with a result that arrives after the caller stopped waiting (abort), e.g. to release it. */
  onLateResult?: (value: T) => void;
}

interface Pending {
  reject(e: EngineError): void;
}

export type ResetListener = (reason: EngineResetReason) => void;

export class WorkerSupervisor<R> {
  private current: SpawnedWorker<R> | null = null;
  private generation = 0;
  private seq = 0;
  private readonly pending = new Map<number, Pending>();
  private readonly listeners = new Set<ResetListener>();
  private readonly defaultTimeoutMs: number;

  constructor(private readonly opts: SupervisorOptions<R>) {
    this.defaultTimeoutMs = opts.defaultTimeoutMs ?? DEFAULT_CALL_TIMEOUT_MS;
  }

  /** Generation of the live worker (0 before the first spawn). */
  get liveGeneration(): number {
    return this.current ? this.generation : -1;
  }

  get pendingCount(): number {
    return this.pending.size;
  }

  get running(): boolean {
    return this.current !== null;
  }

  /** The live remote, spawning a worker when there is none. */
  remote(): R {
    if (this.current) return this.current.remote;
    const gen = ++this.generation;
    const spawned = this.opts.spawn(gen);
    this.current = spawned;
    spawned.onCrash((detail) => {
      if (this.current === spawned) this.reset('crashed', detail);
    });
    return spawned.remote;
  }

  isLive(img: EngineImage | null | undefined): boolean {
    return !!img && !!this.current && handleGeneration(img.id) === this.generation;
  }

  assertLive(img: EngineImage): void {
    if (!this.isLive(img)) {
      throw new EngineError('STALE_HANDLE', 'This image belongs to an engine session that has ended; decode it again', {
        id: img?.id ?? '',
      });
    }
  }

  onReset(cb: ResetListener): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  /** Terminate the worker, reject every pending call and notify listeners. */
  reset(reason: EngineResetReason, detail = ''): void {
    const spawned = this.current;
    this.current = null;
    if (spawned) {
      try {
        spawned.terminate();
      } catch {
        // already gone
      }
    }
    const err = new EngineError('WORKER_CRASHED',`Engine worker ${reason}${detail ? `: ${detail}` : ''}`, { reason });
    const all = [...this.pending.values()];
    this.pending.clear();
    for (const p of all) p.reject(err);
    if (!spawned) return;
    for (const cb of [...this.listeners]) {
      try {
        cb(reason);
      } catch {
        // a listener must not break the reset
      }
    }
  }

  /** Run `fn` against the live remote with tracking, timeout and abort handling. */
  call<T>(fn: (remote: R) => Promise<T>, spec: CallSpec<T> = {}): Promise<T> {
    const { signal, terminateOnAbort, handles, onLateResult } = spec;
    const timeoutMs = spec.timeoutMs ?? this.defaultTimeoutMs;
    if (signal?.aborted) return Promise.reject(new EngineError('CANCELLED', 'Cancelled'));
    try {
      for (const h of handles ?? []) this.assertLive(h);
    } catch (e) {
      return Promise.reject(e);
    }

    return new Promise<T>((resolve, reject) => {
      const id = ++this.seq;
      let settled = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const cleanup = () => {
        settled = true;
        this.pending.delete(id);
        if (timer !== undefined) clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
      };
      const fail = (e: unknown) => {
        if (settled) return;
        cleanup();
        reject(e);
      };
      const onAbort = () => {
        if (settled) return;
        fail(new EngineError('CANCELLED', 'Cancelled'));
        if (terminateOnAbort) this.reset('aborted');
      };

      let remote: R;
      try {
        remote = this.remote();
      } catch (e) {
        reject(e);
        return;
      }
      this.pending.set(id, { reject: fail });
      signal?.addEventListener('abort', onAbort, { once: true });
      if (timeoutMs > 0) {
        timer = setTimeout(() => {
          if (settled) return;
          fail(new EngineError('TIMEOUT', `Engine call timed out after ${timeoutMs} ms`, { timeoutMs }));
          this.reset('timeout');
        }, timeoutMs);
      }

      let started: Promise<T>;
      try {
        started = fn(remote);
      } catch (e) {
        fail(e);
        return;
      }
      started.then(
        (value) => {
          if (settled) {
            onLateResult?.(value);
            return;
          }
          cleanup();
          resolve(value);
        },
        (e: unknown) => fail(e),
      );
    });
  }
}
