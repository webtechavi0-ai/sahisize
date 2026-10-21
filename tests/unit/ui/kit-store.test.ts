import { beforeEach, describe, expect, it } from 'vitest';
import {
  FEEDBACK_DELAY_MS,
  KIT_TTL_MS,
  __resetKitStoreForTests,
  clearFeedbackPending,
  clearKit,
  emptyKit,
  flushKit,
  getDueFeedback,
  isPersistent,
  loadKit,
  purgeOld,
  saveKit,
  setFeedbackPending,
  storageReady,
  type KitState,
} from '@/lib/kit-store';

let n = 0;
const slug = () => `exam-${++n}`;

function withDoc(s: KitState): KitState {
  return {
    ...s,
    current: { docKey: 'photo', screen: 'result' },
    docs: {
      photo: {
        status: 'done',
        crop: {
          rect: { x: 0.1, y: 0.1, w: 0.8, h: 0.8 },
          rot90: 0,
          fineDeg: 0,
          flip: { h: false, v: false },
          zoom: 1,
          panX: 0,
          panY: 0,
        },
        output: {
          blob: new Blob(['x']),
          sizeBytes: 1,
          w: 200,
          h: 230,
          quality: 80,
          stages: ['encode'],
          checks: [],
        },
      },
    },
  };
}

describe('kit-store (K9, PLAN 3.9)', () => {
  beforeEach(() => __resetKitStoreForTests());

  it('uses IndexedDB when available', async () => {
    expect(await storageReady()).toBe(true);
    expect(isPersistent()).toBe(true);
  });

  it('starts empty, then restores what was saved after a "reload"', async () => {
    const s = slug();
    const first = await loadKit(s, 'h1', '2026');
    expect(first.restored).toBe(false);
    saveKit(withDoc(first.state));
    await flushKit();
    __resetKitStoreForTests(); // simulates a page reload (module state gone, IDB kept)
    const again = await loadKit(s, 'h1', '2026');
    expect(again.restored).toBe(true);
    expect(again.state.current).toEqual({ docKey: 'photo', screen: 'result' });
    expect(again.state.docs.photo?.status).toBe('done');
    expect(again.stale).toEqual([]);
  });

  it('debounces writes: only the last state is stored', async () => {
    const s = slug();
    const base = (await loadKit(s, 'h', 'c')).state;
    saveKit({ ...base, cycle: 'a' });
    saveKit({ ...base, cycle: 'b' });
    await flushKit();
    expect((await loadKit(s, 'h', 'c')).state.cycle).toBe('b');
  });

  it('a changed presetHash drops outputs, keeps crops and marks docs stale', async () => {
    const s = slug();
    saveKit(withDoc(emptyKit(s, 'old', '2026')));
    await flushKit();
    const r = await loadKit(s, 'new', '2026');
    expect(r.stale).toEqual(['photo']);
    expect(r.state.presetHash).toBe('new');
    expect(r.state.docs.photo?.output).toBeUndefined();
    expect(r.state.docs.photo?.crop).toBeDefined();
    expect(r.state.docs.photo?.stale).toBe(true);
  });

  it('"Start over" clears the kit', async () => {
    const s = slug();
    saveKit(withDoc(emptyKit(s, 'h', '2026')));
    await flushKit();
    await clearKit(s);
    expect((await loadKit(s, 'h', '2026')).restored).toBe(false);
  });

  it('clearKit also cancels a pending debounced write', async () => {
    const s = slug();
    saveKit(withDoc(emptyKit(s, 'h', '2026')));
    await clearKit(s);
    await flushKit();
    expect((await loadKit(s, 'h', '2026')).restored).toBe(false);
  });

  it('purges kits older than 30 days', async () => {
    const s = slug();
    saveKit(withDoc(emptyKit(s, 'h', '2026')));
    await flushKit();
    const purged = await purgeOld(Date.now() + KIT_TTL_MS + 1000);
    expect(purged).toBeGreaterThanOrEqual(1);
    expect((await loadKit(s, 'h', '2026')).restored).toBe(false);
  });

  it('feedback prompt is due only after 1 hour, and can be cleared (K15)', async () => {
    const now = Date.now();
    await setFeedbackPending({ slug: 'ibps-po', exam: 'IBPS PO', docs: [], downloadedAt: now });
    expect(await getDueFeedback(now + 1000)).toBeNull();
    expect((await getDueFeedback(now + FEEDBACK_DELAY_MS))?.slug).toBe('ibps-po');
    await clearFeedbackPending();
    expect(await getDueFeedback(now + FEEDBACK_DELAY_MS * 2)).toBeNull();
  });
});
