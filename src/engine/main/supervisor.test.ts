import { afterEach, describe, expect, it, vi } from 'vitest';
import type { EngineImage } from '../types';
import { WorkerSupervisor, type SpawnedWorker } from './supervisor';

interface FakeRemote {
  generation: number;
  run<T>(v: T, ms?: number): Promise<T>;
  hang(): Promise<never>;
}

function setup(defaultTimeoutMs = 1000) {
  const spawned: { crash(detail?: string): void; terminated: boolean }[] = [];
  const sup = new WorkerSupervisor<FakeRemote>({
    defaultTimeoutMs,
    spawn(generation): SpawnedWorker<FakeRemote> {
      let crashCb: (d: string) => void = () => {};
      const entry = { crash: (d = 'boom') => crashCb(d), terminated: false };
      spawned.push(entry);
      return {
        remote: {
          generation,
          run: (v, ms = 0) => new Promise((r) => setTimeout(() => r(v), ms)),
          hang: () => new Promise<never>(() => {}),
        },
        terminate: () => {
          entry.terminated = true;
        },
        onCrash: (cb) => {
          crashCb = cb;
        },
      };
    },
  });
  return { sup, spawned };
}

const handle = (gen: number, n = 1): EngineImage => ({ id: `g${gen}-${n}`, width: 1, height: 1 });

afterEach(() => {
  vi.useRealTimers();
});

describe('WorkerSupervisor', () => {
  it('spawns lazily and resolves calls', async () => {
    const { sup, spawned } = setup();
    expect(spawned.length).toBe(0);
    await expect(sup.call((r) => r.run(42))).resolves.toBe(42);
    expect(spawned.length).toBe(1);
    expect(sup.pendingCount).toBe(0);
  });

  it('rejects every pending call with WORKER_CRASHED on a crash and respawns lazily', async () => {
    const { sup, spawned } = setup();
    const resets: string[] = [];
    sup.onReset((r) => resets.push(r));
    const a = sup.call((r) => r.hang());
    const b = sup.call((r) => r.hang());
    expect(sup.pendingCount).toBe(2);
    spawned[0]!.crash();
    await expect(a).rejects.toMatchObject({ code: 'WORKER_CRASHED', details: { reason: 'crashed' } });
    await expect(b).rejects.toMatchObject({ code: 'WORKER_CRASHED' });
    expect(spawned[0]!.terminated).toBe(true);
    expect(resets).toEqual(['crashed']);
    await expect(sup.call((r) => r.run(r.generation))).resolves.toBe(2);
  });

  it('fails stale handles with STALE_HANDLE before sending anything', async () => {
    const { sup, spawned } = setup();
    await sup.call((r) => r.run(0));
    const live = handle(1);
    expect(sup.isLive(live)).toBe(true);
    spawned[0]!.crash();
    expect(sup.isLive(live)).toBe(false);
    const fn = vi.fn((r: FakeRemote) => r.run(1));
    await expect(sup.call(fn, { handles: [live] })).rejects.toMatchObject({ code: 'STALE_HANDLE' });
    expect(fn).not.toHaveBeenCalled();
  });

  it('times out, restarts the worker and rejects with TIMEOUT', async () => {
    vi.useFakeTimers();
    const { sup, spawned } = setup(50);
    const other = sup.call((r) => r.hang(), { timeoutMs: 0 });
    const p = sup.call((r) => r.hang());
    vi.advanceTimersByTime(60);
    await expect(p).rejects.toMatchObject({ code: 'TIMEOUT' });
    await expect(other).rejects.toMatchObject({ code: 'WORKER_CRASHED', details: { reason: 'timeout' } });
    expect(spawned[0]!.terminated).toBe(true);
  });

  it('aborts without killing the worker and releases a late result', async () => {
    const { sup, spawned } = setup();
    const ctrl = new AbortController();
    const late = vi.fn();
    const p = sup.call((r) => r.run('img', 20), { signal: ctrl.signal, onLateResult: late });
    ctrl.abort();
    await expect(p).rejects.toMatchObject({ code: 'CANCELLED' });
    await new Promise((r) => setTimeout(r, 40));
    expect(late).toHaveBeenCalledWith('img');
    expect(spawned[0]!.terminated).toBe(false);
    await expect(sup.call((r) => r.run(1), { signal: ctrl.signal })).rejects.toMatchObject({ code: 'CANCELLED' });
  });

  it('terminateOnAbort resets the worker', async () => {
    const { sup, spawned } = setup();
    const ctrl = new AbortController();
    const p = sup.call((r) => r.hang(), { signal: ctrl.signal, terminateOnAbort: true });
    ctrl.abort();
    await expect(p).rejects.toMatchObject({ code: 'CANCELLED' });
    expect(spawned[0]!.terminated).toBe(true);
    expect(sup.running).toBe(false);
  });

  it('ignores crash events from a worker that was already replaced', async () => {
    const { sup, spawned } = setup();
    await sup.call((r) => r.run(0));
    sup.reset('terminated');
    await sup.call((r) => r.run(0));
    const p = sup.call((r) => r.run('ok', 5));
    spawned[0]!.crash();
    await expect(p).resolves.toBe('ok');
  });
});
