/**
 * One decoded input image for a tool island: picks a file, loads the engine lazily
 * (SPEC 13), decodes to an engine handle and makes a displayable URL (the original for
 * JPG/PNG/WebP, an engine preview for HEIC/PDF). Releases the handle and URL on change
 * and unmount.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { EngineImage } from '@/engine/types';
import { loadEngine } from '@/components/kit/engine';
import { isPdf } from '@/components/kit/Uploader';
import { inputFormat, kbBucket, track } from '@/lib/analytics';
import type { DocType } from '@/engine/types';

export type Engine = Awaited<ReturnType<typeof loadEngine>>;

export interface ToolImage {
  file: File;
  img: EngineImage;
  /** Object URL to show the image (Cropper src, before preview). */
  src: string;
}

export function useToolImage(tool: string, doc: DocType = 'other') {
  const [image, setImage] = useState<ToolImage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const cur = useRef<ToolImage | null>(null);
  const seq = useRef(0);

  const drop = useCallback((it: ToolImage | null) => {
    if (!it) return;
    URL.revokeObjectURL(it.src);
    loadEngine()
      .then((e) => e.release(it.img))
      .catch(() => {});
  }, []);

  const load = useCallback(
    async (file: File): Promise<ToolImage | null> => {
      const my = ++seq.current;
      setLoading(true);
      setError(null);
      try {
        const engine = await loadEngine();
        let img: EngineImage;
        if (isPdf(file)) {
          const pages = await engine.decodePdfPages(file, { pages: [1] });
          img = pages[0]!;
          for (const p of pages.slice(1)) engine.release(p);
        } else {
          img = await engine.decode(file);
        }
        let src: string;
        if (/^image\/(jpeg|png|webp)$/.test(file.type)) src = URL.createObjectURL(file);
        else {
          const p = await engine.preview(img, { maxSide: 1600 });
          src = URL.createObjectURL(new Blob([p.bytes], { type: p.mime }));
        }
        const next = { file, img, src };
        if (my !== seq.current) {
          drop(next);
          return null;
        }
        drop(cur.current);
        cur.current = next;
        setImage(next);
        track('doc_uploaded', {
          tool,
          doc,
          inputFormat: inputFormat(file.type, file.name),
          kbBucket: kbBucket(file.size),
        });
        return next;
      } catch (e) {
        if (my === seq.current) setError(e);
        return null;
      } finally {
        if (my === seq.current) setLoading(false);
      }
    },
    [drop, tool, doc],
  );

  const reset = useCallback(() => {
    seq.current++;
    drop(cur.current);
    cur.current = null;
    setImage(null);
    setError(null);
    setLoading(false);
  }, [drop]);

  useEffect(() => () => drop(cur.current), [drop]);

  return { image, loading, error, load, reset, setError };
}
