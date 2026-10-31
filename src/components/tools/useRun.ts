/**
 * Latest-wins async runner for tool islands: busy flag, error, aria-live message.
 * A newer run makes older results stale (they are dropped, not shown).
 */
import { useCallback, useRef, useState } from 'react';

export function useRun<R>() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [result, setResult] = useState<R | null>(null);
  const seq = useRef(0);

  const run = useCallback(async (fn: () => Promise<R>): Promise<R | null> => {
    const my = ++seq.current;
    setBusy(true);
    setError(null);
    try {
      const r = await fn();
      if (my !== seq.current) return null;
      setResult(r);
      return r;
    } catch (e) {
      if (my === seq.current) {
        setError(e);
        setResult(null);
      }
      return null;
    } finally {
      if (my === seq.current) setBusy(false);
    }
  }, []);

  const clear = useCallback(() => {
    seq.current++;
    setBusy(false);
    setError(null);
    setResult(null);
  }, []);

  return { busy, error, result, run, clear, setError };
}

/** Debounced effect trigger: call `bump()` and `fn` runs once after `ms` of quiet. */
export function useDebounced(fn: () => void, ms = 400) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  return useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => fnRef.current(), ms);
  }, [ms]);
}
