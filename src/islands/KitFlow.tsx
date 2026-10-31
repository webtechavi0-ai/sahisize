'use client';
/**
 * KitFlow island (SPEC 5.1 K2-K15, 6.4): checklist -> upload -> crop -> auto-fit ->
 * result -> summary (ZIP, individual downloads, Web Share). State persists on the
 * device in IndexedDB (src/lib/kit-store.ts); the engine loads lazily on first file.
 *
 * ---------------------------------------------------------------------------------
 * Mount contract for Workstream C (src/app/kit and src/app/hi/kit pages):
 *
 *   ---
 *   import KitFlow from '@/islands/KitFlow';
 *   import { toKitPreset } from '@/components/kit/kit-preset';   // server-only helper
 *   import { getNamespace, localizePath } from '@/i18n';
 *   const preset = getPreset(slug)!;                               // published preset
 *   ---
 *   <KitFlow
 *     client:load
 *     preset={toKitPreset(preset)}                      // KitPreset (slim, serialisable)
 *     lang={lang}                                       // 'en' | 'hi'
 *     dict={getNamespace(lang, 'common', 'ui', 'kit')}  // only these namespaces
 *     examHref={localizePath(`/exam/${slug}`, lang)}    // header back link from the checklist
 *     reportHref={localizePath('/report', lang)}        // K15 "No" -> report form
 *   >
 *     <PromoSlot slot="promo" ... />                    // optional; shown under the summary only
 *   </KitFlow>
 *
 * Props are plain JSON (no functions). The island renders its own minimal header
 * (back, exam name, step count) and a sticky bottom action bar; use KitLayout chrome.
 * ---------------------------------------------------------------------------------
 */
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Lang } from '@/config/site';
import { createT, plural, type Dict } from '@/i18n/core';
import { cropAspect, type EngineImage, type FitCheck, type NameDate } from '@/engine/types';
import { inputFormat, kbBucket, track } from '@/lib/analytics';
import { downloadBlob, mimeForName } from '@/lib/download';
import { formatKB, loc, type T } from '@/lib/format';
import {
  clearKit,
  emptyKit,
  flushKit,
  isPersistent,
  onPersistenceLost,
  loadKit,
  saveKit,
  setFeedbackPending,
  storableSource,
  type CleanupState,
  type CropState,
  type DocOutput,
  type DocState,
  type KitState,
} from '@/lib/kit-store';
import { Button, ButtonLink } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { LiveRegion } from '@/components/ui/LiveRegion';
import { Skeleton } from '@/components/ui/Skeleton';
import { Slider } from '@/components/ui/Slider';
import { Toggle } from '@/components/ui/Toggle';
import { ChevronLeft, Download, FileBadge, TriangleAlert } from '@/components/ui/Icon';
import { CaptureExample, hasCaptureExample } from '@/components/kit/CaptureExample';
import { CertificateStep } from '@/components/kit/CertificateStep';
import { Cropper } from '@/components/kit/Cropper';
import { guideFor } from '@/components/kit/CropGuides';
import { DeclarationTraceSheet } from '@/components/kit/DeclarationTraceSheet';
import { DocCard } from '@/components/kit/DocCard';
import { DocIcon } from '@/components/kit/DocIcon';
import { KbMeter } from '@/components/kit/KbMeter';
import { LiveCaptureNotice } from '@/components/kit/LiveCaptureNotice';
import {
  NameDateStripForm,
  isNameDateComplete,
  todayDdMmYyyy,
} from '@/components/kit/NameDateStripForm';
import { PassCheck, canDownload, failedRequired, passSummary } from '@/components/kit/PassCheck';
import { ResultPreview } from '@/components/kit/ResultPreview';
import { ShareButton } from '@/components/kit/ShareButton';
import { StepProgress, type StepState } from '@/components/kit/StepProgress';
import { SummaryGrid } from '@/components/kit/SummaryGrid';
import { TrustLine } from '@/components/kit/TrustLine';
import { Uploader, isPdf, type UploadError } from '@/components/kit/Uploader';
import { VariantGuide } from '@/components/kit/VariantGuide';
import { defaultCropState, engineCropArgs } from '@/components/kit/crop-math';
import { loadEngine } from '@/components/kit/engine';
import { errorCode, errorMessage } from '@/components/kit/errors';
import type { KitDoc, KitPreset } from '@/components/kit/kit-types';
import { FeedbackPrompt } from './FeedbackPrompt';

export type { KitDoc, KitPreset } from '@/components/kit/kit-types';

export interface KitFlowProps {
  preset: KitPreset;
  lang: Lang;
  /** getNamespace(lang, 'common', 'ui', 'kit') */
  dict: Dict;
  /** Back link from the checklist. Default `/exam/{slug}`. */
  examHref?: string;
  /** K15 report form. Default '/report'. */
  reportHref?: string;
  /** Named slot "promo": rendered under the summary only (SPEC 6.4, 10). */
  promo?: ReactNode;
  /**
   * Render the island's own sticky header (back, exam name, done count). Default true.
   * Pass false when the layout already has one; screen titles then become <h2>.
   */
  showHeader?: boolean;
  /** docSlug: pre-set to a single document (/exam/[slug]/[document]); starts at its upload. */
  only?: string;
}

export type Screen = 'checklist' | 'upload' | 'crop' | 'result' | 'summary';

/** Document types with their own upload instruction (kit.upload.how.*). */
const HOW_KEYS: readonly string[] = ['photo', 'signature', 'thumb', 'declaration', 'certificate'];

/** True once for a `#start` link; the hash is removed so Back and reload show the checklist. */
function startRequested(): boolean {
  if (typeof location === 'undefined' || location.hash !== '#start') return false;
  try {
    history.replaceState(history.state, '', location.pathname + location.search);
  } catch {
    /* ignore */
  }
  return true;
}

interface Runtime {
  img: EngineImage;
  /** Displayable URL for the cropper. */
  src: string;
  source: Blob;
}

type Engine = Awaited<ReturnType<typeof loadEngine>>;

function cleanupKind(doc: KitDoc): 'signature' | 'thumb' | null {
  if (doc.spec.cleanup !== undefined) return doc.spec.cleanup;
  return doc.spec.doc === 'signature' ? 'signature' : doc.spec.doc === 'thumb' ? 'thumb' : null;
}

function defaultCleanup(doc: KitDoc): CleanupState {
  return { on: !!doc.spec.cleanup, strength: 50, ink: 'black' };
}

/** README.txt inside the ZIP (English, no user data). The engine fills `{{files}}` with names and sizes. */
export function zipReadme(preset: KitPreset): string {
  const lines = [`${preset.name.en} (${preset.cycle}) - files made with SahiSize`, '', 'Files:', '{{files}}', ''];
  if (preset.source) {
    lines.push(
      `Specs source: ${preset.source.notification}`,
      `  ${preset.source.url}`,
      `Specs last checked: ${preset.source.lastChecked}`,
      '',
    );
  }
  lines.push('Processed on your device. Never uploaded.', 'Always check the latest official notice before you submit.');
  return lines.join('\r\n');
}

/** Pass-check rows for a certificate PDF (K14). */
export function pdfChecks(
  sizeBytes: number,
  minKB: number | null,
  maxKB: number | null,
): FitCheck[] {
  const kb = sizeBytes / 1024;
  const range = minKB ? `${minKB}–${maxKB} KB` : `≤ ${maxKB} KB`;
  // KB rule (Q26): pass both readings, >= minKB×1024 and <= maxKB×1000.
  return [
    {
      rule: 'size',
      pass: maxKB !== null && sizeBytes <= maxKB * 1000 && sizeBytes >= (minKB ?? 0) * 1024,
      actual: `${kb.toFixed(1)} KB`,
      required: range,
      level: 'required',
    },
    { rule: 'format', pass: true, actual: 'PDF', required: 'PDF', level: 'required' },
  ];
}


// Per-fit User Timing (PLAN H1 contract, tests/e2e/helpers/kit.ts): marks
// `sahisize:fit:<doc>:start` / `:end` and a measure `sahisize:fit:<doc>` spanning crop,
// cleanup, fit and the switch to the result screen. Failed fits leave only the start mark.
let fitSeq = 0;
function fitMarkStart(key: string): string | null {
  if (typeof performance === 'undefined' || typeof performance.mark !== 'function') return null;
  const id = `sahisize:fit:${key}#${++fitSeq}`;
  try {
    performance.mark(`${id}:start`);
    return id;
  } catch {
    return null;
  }
}
function fitMarkEnd(id: string | null) {
  if (!id) return;
  try {
    performance.mark(`${id}:end`);
    performance.measure(id, `${id}:start`, `${id}:end`);
  } catch {
    /* User Timing unavailable */
  }
}

export default function KitFlow({
  preset,
  lang,
  dict,
  examHref,
  reportHref = '/report',
  promo,
  showHeader = true,
  only,
}: KitFlowProps) {
  const t: T = useMemo(() => createT(dict), [dict]);
  const exam = loc(preset.name, lang);
  const slug = preset.slug;
  const docs = useMemo(() => {
    const one = only ? preset.docs.filter((d) => d.key === only) : [];
    return one.length ? one : preset.docs;
  }, [preset, only]);
  const onlyKey = only && docs.length === 1 && docs[0]!.key === only ? only : null;

  const [kit, setKitState] = useState<KitState>(() => emptyKit(slug, preset.hash, preset.cycle, 0));
  const kitRef = useRef(kit);
  kitRef.current = kit;
  const loadedRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState<Screen>(onlyKey ? 'upload' : 'checklist');
  const [activeKey, setActiveKey] = useState<string | null>(onlyKey);
  const [busy, setBusy] = useState<string | null>(null);
  /** Each progress-reporting call takes a token; callbacks from a finished call are ignored. */
  const progressToken = useRef(0);
  const [error, setError] = useState<string | null>(null);
  const [announce, setAnnounce] = useState('');
  const [notice, setNotice] = useState<{ restored: boolean; stale: boolean; noPersist: boolean }>({
    restored: false,
    stale: false,
    noPersist: false,
  });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cropReady, setCropReady] = useState(false);
  const runtimes = useRef(new Map<string, Runtime>());
  const headingRef = useRef<HTMLHeadingElement>(null);

  const doc = docs.find((d) => d.key === activeKey) ?? null;
  const ds: DocState = (activeKey && kit.docs[activeKey]) || { status: 'todo' };
  const doneCount = docs.filter((d) => kit.docs[d.key]?.status === 'done').length;

  // ---- state helpers -------------------------------------------------------

  const setKit = useCallback((fn: (k: KitState) => KitState) => {
    const next = fn(kitRef.current);
    kitRef.current = next;
    setKitState(next);
    if (loadedRef.current) saveKit(next);
  }, []);

  const updateDoc = useCallback(
    (key: string, patch: Partial<DocState>) =>
      setKit((k) => ({
        ...k,
        docs: { ...k.docs, [key]: { ...(k.docs[key] ?? { status: 'todo' }), ...patch } },
      })),
    [setKit],
  );

  const go = useCallback(
    (s: Screen, key: string | null = activeKey) => {
      setError(null);
      setScreen(s);
      setActiveKey(key);
      setKit((k) => ({
        ...k,
        current:
          key && (s === 'upload' || s === 'crop' || s === 'result')
            ? { docKey: key, screen: s }
            : null,
      }));
    },
    [activeKey, setKit],
  );

  const releaseRuntime = useCallback((key: string, engine?: Engine) => {
    const rt = runtimes.current.get(key);
    if (!rt) return;
    runtimes.current.delete(key);
    if (rt.src.startsWith('blob:')) URL.revokeObjectURL(rt.src);
    if (engine) engine.release(rt.img);
    else
      void loadEngine()
        .then((e) => e.release(rt.img))
        .catch(() => {});
  }, []);

  const reportError = useCallback(
    (e: unknown, d: KitDoc | null) => {
      const msg = errorMessage(t, e);
      setError(msg);
      setAnnounce(msg);
      track('error', { code: errorCode(e), exam: slug, ...(d ? { doc: d.spec.doc } : {}) });
    },
    [t, slug],
  );

  /** Decode the doc's source into an engine handle (+ display URL), cached per doc. */
  const ensureImage = useCallback(
    async (key: string, source: Blob): Promise<Runtime> => {
      const have = runtimes.current.get(key);
      if (have && have.source === source) return have;
      if (have) releaseRuntime(key);
      const engine = await loadEngine();
      let img: EngineImage;
      if (isPdf(source)) {
        const pages = await engine.decodePdfPages(source, { pages: [1] });
        img = pages[0]!;
        for (const p of pages.slice(1)) engine.release(p);
      } else {
        img = await engine.decode(source);
      }
      let src: string;
      if (/^image\/(jpeg|png|webp|gif)$/.test(source.type)) {
        src = URL.createObjectURL(source);
      } else {
        const p = await engine.preview(img, { maxSide: 1600 });
        src = URL.createObjectURL(new Blob([p.bytes], { type: p.mime }));
      }
      const rt = { img, src, source };
      runtimes.current.set(key, rt);
      return rt;
    },
    [releaseRuntime],
  );

  // ---- load / persist ------------------------------------------------------

  // A write can fail after load (private mode rejects Blobs): show the banner then.
  useEffect(
    () => onPersistenceLost(() => setNotice((n) => (n.noPersist ? n : { ...n, noPersist: true }))),
    [],
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      const { state, restored, stale } = await loadKit(slug, preset.hash, preset.cycle);
      if (!alive) return;
      // Drop state for documents the preset no longer has.
      const all = new Set(preset.docs.map((d) => d.key));
      for (const k of Object.keys(state.docs)) if (!all.has(k)) delete state.docs[k];
      if (state.current && !all.has(state.current.docKey)) state.current = null;
      const keys = new Set(docs.map((d) => d.key));
      kitRef.current = state;
      setKitState(state);
      loadedRef.current = true;
      setNotice({
        restored: restored && Object.keys(state.docs).length > 0,
        stale: stale.length > 0,
        noPersist: !isPersistent(),
      });
      if (stale.length) saveKit(state);
      const cur = state.current && keys.has(state.current.docKey) ? state.current : null;
      if (onlyKey && !cur) {
        const d = state.docs[onlyKey];
        setScreen(d?.output ? 'result' : d?.source ? 'crop' : 'upload');
      } else if (cur) {
        const d = state.docs[cur.docKey];
        const screenOk =
          cur.screen === 'upload' ||
          (cur.screen === 'crop' && (d?.source || d?.sources?.length)) ||
          (cur.screen === 'result' && d?.output);
        setActiveKey(cur.docKey);
        setScreen(screenOk ? cur.screen : 'upload');
      } else if (!onlyKey && startRequested()) {
        // The exam page's "Make my files" button links to #start: it already listed the
        // documents, so skip the checklist and open the first one still to do.
        const first = nextDoc(null);
        if (first) {
          setActiveKey(first.key);
          const fs = state.docs[first.key];
          setScreen(
            fs?.output ? 'result' : first.spec.format !== 'pdf' && fs?.source ? 'crop' : 'upload',
          );
        }
      }
      setReady(true);
      if (stale.length) void refitStale(stale);
    })();
    const onHide = () => void flushKit();
    window.addEventListener('pagehide', onHide);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      alive = false;
      window.removeEventListener('pagehide', onHide);
      document.removeEventListener('visibilitychange', onHide);
      void flushKit();
      for (const k of [...runtimes.current.keys()]) releaseRuntime(k);
    };
  }, []);

  // Move focus to the screen heading for keyboard and screen-reader users.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [screen, activeKey]);

  // Crop screen needs a decoded image (e.g. after reload).
  useEffect(() => {
    if (screen !== 'crop' || !doc || !ready) return;
    const source = kitRef.current.docs[doc.key]?.source;
    if (!source) return;
    let alive = true;
    setCropReady(runtimes.current.get(doc.key)?.source === source);
    ensureImage(doc.key, source)
      .then(() => alive && setCropReady(true))
      .catch((e) => {
        if (!alive) return;
        reportError(e, doc);
        setScreen('upload');
      });
    return () => {
      alive = false;
    };
  }, [screen, doc, ready, ensureImage, reportError]);

  // ---- actions ---------------------------------------------------------------

  const markStarted = () => {
    if (kitRef.current.started) return;
    track('kit_started', { exam: slug, docs: docs.length });
    setKit((k) => ({ ...k, started: true }));
  };

  const openDoc = (d: KitDoc) => {
    for (const k of [...runtimes.current.keys()]) if (k !== d.key) releaseRuntime(k);
    const s = kitRef.current.docs[d.key];
    if (s?.output) go('result', d.key);
    else if (d.spec.format !== 'pdf' && s?.source) go('crop', d.key);
    else go('upload', d.key);
  };

  const nextDoc = (fromKey: string | null): KitDoc | null => {
    const i = docs.findIndex((d) => d.key === fromKey);
    const order = [...docs.slice(i + 1), ...docs.slice(0, Math.max(0, i))];
    return order.find((d) => kitRef.current.docs[d.key]?.status !== 'done' && !d.optional) ?? null;
  };

  const onReject = (err: UploadError) => {
    track('error', { code: err.code, exam: slug, ...(doc ? { doc: doc.spec.doc } : {}) });
  };

  const onUpload = async (files: File[]) => {
    if (!doc || !files[0]) return;
    const file = files[0];
    const d = doc;
    markStarted();
    track('doc_uploaded', {
      exam: slug,
      doc: d.spec.doc,
      inputFormat: inputFormat(file.type, file.name),
      kbBucket: kbBucket(file.size),
    });
    setError(null);
    setBusy(t('kit.upload.reading'));
    setAnnounce(t('kit.upload.reading'));
    try {
      const source = await storableSource(file);
      const prev = kitRef.current.docs[d.key];
      updateDoc(d.key, {
        status: 'in-progress',
        source,
        crop: undefined,
        output: undefined,
        stale: false,
        cleanup: prev?.cleanup ?? defaultCleanup(d),
      });
      await ensureImage(d.key, source);
      // Sensible default: fit straight away with the default (centred) crop, the same crop
      // the Cropper starts with, so the user only confirms ("Looks good" / "Adjust crop").
      // A name/date strip needs input first, so that document still opens the crop screen.
      if (d.spec.needsNameDateStrip) go('crop', d.key);
      else await runFit(d, true, 'crop');
    } catch (e) {
      reportError(e, d);
    } finally {
      setBusy(null);
    }
  };

  const onCertAdd = (files: File[]) => {
    if (!doc) return;
    markStarted();
    for (const f of files) {
      track('doc_uploaded', {
        exam: slug,
        doc: doc.spec.doc,
        inputFormat: inputFormat(f.type, f.name),
        kbBucket: kbBucket(f.size),
      });
    }
    const cur = kitRef.current.docs[doc.key]?.sources ?? [];
    updateDoc(doc.key, {
      status: 'in-progress',
      sources: [...cur, ...files].slice(0, 20),
      output: undefined,
    });
  };

  const onCertRemove = (i: number) => {
    if (!doc) return;
    const cur = kitRef.current.docs[doc.key]?.sources ?? [];
    updateDoc(doc.key, { sources: cur.filter((_, j) => j !== i), output: undefined });
  };

  const saveOutput = (d: KitDoc, output: DocOutput) => {
    const pass = canDownload(output.checks);
    updateDoc(d.key, { output, status: pass ? 'done' : 'in-progress', stale: false });
    return pass;
  };

  /**
   * Crop -> (cleanup) -> fit. Returns true on success. `failTo`: screen to show with the
   * error when a navigating fit fails (auto-fit after upload lands on the crop screen).
   */
  const runFit = async (d: KitDoc, navigate = true, failTo?: Screen): Promise<boolean> => {
    const state = kitRef.current.docs[d.key];
    if (!state?.source) return false;
    if (navigate) {
      setError(null);
      setBusy(t('kit.crop.fitting', { exam }));
      setAnnounce(t('kit.crop.fitting', { exam }));
    }
    const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const perfId = fitMarkStart(d.key);
    try {
      const engine = await loadEngine();
      const rt = await ensureImage(d.key, state.source);
      const aspect = cropAspect(d.spec);
      const crop: CropState = state.crop ?? defaultCropState(rt.img.width, rt.img.height, aspect);
      const args = engineCropArgs(crop, rt.img.width, rt.img.height);
      let img = await engine.crop(rt.img, args.rect, args.rotationDeg, args.flip);
      const kind = cleanupKind(d);
      const cl = state.cleanup ?? defaultCleanup(d);
      if (kind && cl.on) {
        const cleaned = await engine.cleanup(img, kind, {
          strength: cl.strength,
          ink: kind === 'thumb' ? cl.ink : 'black',
          targetAspect: aspect ?? undefined,
        });
        engine.release(img);
        img = cleaned;
      }
      let res;
      try {
        const nameDate =
          d.spec.needsNameDateStrip && isNameDateComplete(state.nameDate)
            ? state.nameDate
            : undefined;
        res = await engine.fit(img, d.spec, nameDate ? { nameDate } : undefined);
      } finally {
        engine.release(img);
      }
      const ms = Math.round(
        res.durationMs ??
          (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0,
      );
      const pass = saveOutput(d, {
        blob: new Blob([res.bytes], { type: res.format === 'png' ? 'image/png' : 'image/jpeg' }),
        sizeBytes: res.sizeBytes,
        w: res.widthPx,
        h: res.heightPx,
        quality: res.quality,
        stages: res.stages,
        checks: res.checks,
        warnings: res.warnings,
      });
      track('fit_done', { exam: slug, doc: d.spec.doc, pass, stages: res.stages, ms });
      if (navigate) {
        setAnnounce(
          `${t('kit.result.ready', { doc: loc(d.spec.label, lang), kb: formatKB(res.sizeBytes) })} ${passSummary(t, res.checks)}`,
        );
        go('result', d.key);
      }
      fitMarkEnd(perfId);
      return true;
    } catch (e) {
      if (navigate) {
        if (failTo) go(failTo, d.key);
        reportError(e, d);
      } else track('error', { code: errorCode(e), exam: slug, doc: d.spec.doc });
      return false;
    } finally {
      if (navigate) setBusy(null);
    }
  };

  const runPdf = async (d: KitDoc) => {
    const sources = kitRef.current.docs[d.key]?.sources ?? [];
    if (!sources.length) {
      setError(t('kit.certificate.empty'));
      return;
    }
    setError(null);
    setBusy(t('kit.certificate.making', { done: 0, total: sources.length }));
    const t0 = Date.now();
    // Engine progress is fire-and-forget (comlink proxy): a callback can land after the call
    // resolves and must not put the busy state back.
    const token = ++progressToken.current;
    try {
      const engine = await loadEngine();
      const bytes = await engine.imagesToPdf(sources, {
        page: 'a4',
        maxKB: d.spec.maxKB,
        minKB: d.spec.minKB,
        onProgress: (done, total) => {
          if (progressToken.current === token)
            setBusy(t('kit.certificate.making', { done, total }));
        },
      });
      progressToken.current++;
      const checks = pdfChecks(bytes.length, d.spec.minKB, d.spec.maxKB);
      const pass = saveOutput(d, {
        blob: new Blob([bytes], { type: 'application/pdf' }),
        sizeBytes: bytes.length,
        w: 0,
        h: 0,
        quality: 0,
        stages: [],
        checks,
      });
      track('fit_done', { exam: slug, doc: d.spec.doc, pass, stages: [], ms: Date.now() - t0 });
      setAnnounce(passSummary(t, checks));
      go('result', d.key);
    } catch (e) {
      reportError(e, d);
    } finally {
      if (progressToken.current === token) progressToken.current++;
      setBusy(null);
    }
  };

  async function refitStale(keys: string[]) {
    for (const k of keys) {
      const d = docs.find((x) => x.key === k);
      if (!d) continue;
      if (d.spec.format === 'pdf') continue; // user re-makes the PDF from the kept pages
      await runFit(d, false);
    }
    for (const k of keys) releaseRuntime(k);
    setNotice((n) => ({ ...n, stale: false }));
    setAnnounce(t('kit.checklist.staleDone'));
  }

  const markFeedback = () => {
    void setFeedbackPending({
      slug,
      exam,
      docs: docs
        .filter((d) => kitRef.current.docs[d.key]?.output)
        .map((d) => ({ key: d.key, doc: d.spec.doc, label: loc(d.spec.label, lang) })),
      downloadedAt: Date.now(),
    });
  };

  const downloadOne = (d: KitDoc) => {
    const out = kitRef.current.docs[d.key]?.output;
    if (!out || !canDownload(out.checks)) return;
    downloadBlob(out.blob, d.spec.fileName);
    track('doc_downloaded', { exam: slug, doc: d.spec.doc, via: 'download' });
    markFeedback();
  };

  const doneItems = () =>
    docs
      .map((d) => ({ doc: d, output: kitRef.current.docs[d.key]?.output }))
      .filter(
        (x): x is { doc: KitDoc; output: DocOutput } => !!x.output && canDownload(x.output.checks),
      );

  const downloadZip = async () => {
    const items = doneItems();
    if (!items.length) return;
    setBusy(t('kit.summary.zipping'));
    try {
      const engine = await loadEngine();
      const entries = await Promise.all(
        items.map(async ({ doc: d, output }) => ({
          name: d.spec.fileName,
          bytes: new Uint8Array(await output.blob.arrayBuffer()),
        })),
      );
      const zipBytes = await engine.zip(entries, zipReadme(preset));
      downloadBlob(new Blob([zipBytes], { type: 'application/zip' }), `${slug}-sahisize.zip`);
      track('kit_zip_downloaded', { exam: slug, docs: items.length, via: 'download' });
      markFeedback();
      setAnnounce(t('kit.summary.zipDone'));
    } catch (e) {
      reportError(e, null);
    } finally {
      setBusy(null);
    }
  };

  const shareFilesList = () =>
    doneItems().map(
      ({ doc: d, output }) =>
        new File([output.blob], d.spec.fileName, { type: mimeForName(d.spec.fileName) }),
    );

  const startOver = async () => {
    setConfirmOpen(false);
    for (const k of [...runtimes.current.keys()]) releaseRuntime(k);
    loadedRef.current = false;
    await clearKit(slug);
    const fresh = emptyKit(slug, preset.hash, preset.cycle);
    kitRef.current = fresh;
    setKitState(fresh);
    loadedRef.current = true;
    setNotice({ restored: false, stale: false, noPersist: !isPersistent() });
    setScreen('checklist');
    setActiveKey(null);
    setAnnounce(t('kit.startOver.done'));
  };

  // ---- rendering -------------------------------------------------------------

  const stepIndex = doc ? docs.indexOf(doc) + 1 : 0;
  const docName = doc ? loc(doc.spec.label, lang) : '';
  const isPdfDoc = doc?.spec.format === 'pdf';
  /** Header back: cancel "Adjust crop" back to the result, otherwise the document list. */
  const back = () =>
    screen === 'crop' && ds.output && !isPdfDoc ? go('result') : go('checklist', null);
  const retake = () => go('upload');
  const Sub = showHeader ? 'h2' : 'h3';

  let title = '';
  let body: ReactNode = null;
  let action: ReactNode = null;

  if (screen === 'checklist') {
    title = t('kit.checklist.title', { exam });
    const next = nextDoc(null);
    const anyStarted = docs.some(
      (d) => kit.docs[d.key]?.status && kit.docs[d.key]!.status !== 'todo',
    );
    body = (
      <div className="space-y-4">
        <FeedbackPrompt t={t} reportHref={reportHref} />
        <p className="text-muted">{t('kit.checklist.intro')}</p>
        <LiveCaptureNotice t={t} lang={lang} preset={preset} />
        <ul className="space-y-3">
          {docs.map((d) => (
            <li key={d.key}>
              <DocCard
                t={t}
                lang={lang}
                doc={d}
                status={kit.docs[d.key]?.status ?? 'todo'}
                sizeBytes={kit.docs[d.key]?.output?.sizeBytes}
                stale={kit.docs[d.key]?.stale}
                onOpen={() => openDoc(d)}
              />
            </li>
          ))}
        </ul>
        {anyStarted && (
          <div className="pt-2 text-center">
            <Button variant="ghost" onClick={() => setConfirmOpen(true)}>
              {t('common.actions.startOver')}
            </Button>
          </div>
        )}
      </div>
    );
    action = next ? (
      <Button variant="primary" block onClick={() => openDoc(next)}>
        {t(anyStarted ? 'kit.checklist.continue' : 'kit.checklist.start', {
          doc: loc(next.spec.label, lang),
        })}
      </Button>
    ) : (
      <Button variant="primary" block onClick={() => go('summary', null)}>
        {t('kit.checklist.toSummary')}
      </Button>
    );
  } else if (screen === 'upload' && doc) {
    const isCert = isPdfDoc;
    title = t(isCert ? 'kit.certificate.title' : 'kit.upload.title', { doc: docName });
    const how = doc.captureTip
      ? loc(doc.captureTip, lang)
      : t(`kit.upload.how.${HOW_KEYS.includes(doc.spec.doc) ? doc.spec.doc : 'other'}`);
    body =
      busy && !isCert ? (
        <div className="space-y-4">
          <div className="card flex items-center gap-3 p-4" data-testid="kit-busy">
            <span
              className="inline-block h-6 w-6 shrink-0 animate-spin rounded-full border-[3px] border-primary border-r-transparent motion-reduce:animate-none"
              aria-hidden="true"
            />
            <p className="font-semibold">{busy}</p>
          </div>
          <Skeleton className="h-56 w-full" label={busy} />
        </div>
      ) : (
        <div className="space-y-4">
          {!isCert && (
            <div className="card flex items-start gap-3 p-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-saffron-soft text-ink">
                <DocIcon doc={doc.spec.doc} size={28} />
              </span>
              <div className="min-w-0">
                <p className="font-semibold">{how}</p>
                <p className="mt-1 text-sm text-muted">{t('kit.upload.promise', { exam })}</p>
              </div>
            </div>
          )}
          {doc.variant && (
            <VariantGuide t={t} variant={doc.variant} examName={exam} docName={docName} />
          )}
          {doc.spec.doc === 'declaration' && preset.declarationText && (
            <DeclarationTraceSheet
              t={t}
              examName={exam}
              text={preset.declarationText.en}
              toVerify={preset.declarationText.toVerify}
            />
          )}
          {isCert ? (
            <CertificateStep
              t={t}
              lang={lang}
              doc={doc}
              files={ds.sources ?? []}
              onAdd={onCertAdd}
              onRemove={onCertRemove}
              onReject={onReject}
              busy={!!busy}
            />
          ) : (
            <Uploader
              t={t}
              capture={doc.spec.doc === 'photo' ? 'user' : 'environment'}
              onFiles={onUpload}
              onReject={onReject}
              busy={!!busy}
            />
          )}
          {/* Below the buttons so "Take photo" stays above the fold. Variants have their own drawing. */}
          {!doc.variant && hasCaptureExample(doc.spec.doc) && (
            <CaptureExample t={t} doc={doc.spec.doc} />
          )}
        </div>
      );
    if (isCert) {
      action = (
        <Button
          variant="primary"
          block
          busy={!!busy}
          disabled={!ds.sources?.length}
          onClick={() => runPdf(doc)}
        >
          {busy ?? t('kit.certificate.make')}
        </Button>
      );
    }
  } else if (screen === 'crop' && doc) {
    title = t('kit.crop.title', { doc: docName });
    const rt = runtimes.current.get(doc.key);
    const kind = cleanupKind(doc);
    const cl = ds.cleanup ?? defaultCleanup(doc);
    const needsStrip = !!doc.spec.needsNameDateStrip;
    const nd: NameDate = ds.nameDate ?? { name: '', date: todayDdMmYyyy() };
    body = (
      <div className="space-y-4">
        {cropReady && rt ? (
          <Cropper
            key={`${doc.key}:${rt.img.id}`}
            t={t}
            src={rt.src}
            width={rt.img.width}
            height={rt.img.height}
            aspect={cropAspect(doc.spec)}
            guide={guideFor(doc.spec.doc)}
            initial={ds.crop}
            onChange={(c) => updateDoc(doc.key, { crop: c })}
          />
        ) : (
          <Skeleton className="h-[min(56vh,420px)] w-full" label={t('common.loading')} />
        )}
        {kind && (
          <div className="card space-y-2 p-4">
            <Toggle
              label={t(kind === 'thumb' ? 'kit.crop.cleanupThumb' : 'kit.crop.cleanup')}
              hint={t('kit.crop.cleanupHint')}
              checked={cl.on}
              onChange={(on) => updateDoc(doc.key, { cleanup: { ...cl, on } })}
            />
            {cl.on && (
              <Slider
                label={t('kit.crop.strength')}
                min={0}
                max={100}
                step={5}
                value={cl.strength}
                valueText={String(cl.strength)}
                onInput={(strength) => updateDoc(doc.key, { cleanup: { ...cl, strength } })}
              />
            )}
            {cl.on && kind === 'thumb' && (
              <fieldset className="flex flex-wrap items-center gap-2">
                <legend className="mb-1 text-sm font-semibold">{t('kit.crop.ink')}</legend>
                {(['black', 'blue'] as const).map((ink) => (
                  <Button
                    key={ink}
                    variant={cl.ink === ink ? 'primary' : 'secondary'}
                    aria-pressed={cl.ink === ink}
                    onClick={() => updateDoc(doc.key, { cleanup: { ...cl, ink } })}
                  >
                    {t(ink === 'black' ? 'kit.crop.inkBlack' : 'kit.crop.inkBlue')}
                  </Button>
                ))}
              </fieldset>
            )}
          </div>
        )}
        {needsStrip && (
          <NameDateStripForm
            t={t}
            examName={exam}
            value={nd}
            onChange={(v) => updateDoc(doc.key, { nameDate: v })}
          />
        )}
        <Button variant="ghost" onClick={retake}>
          {t('kit.crop.changeFile')}
        </Button>
      </div>
    );
    action = (
      <Button
        variant="primary"
        block
        busy={!!busy}
        disabled={!cropReady || (needsStrip && !isNameDateComplete(ds.nameDate ?? nd))}
        onClick={() => {
          if (needsStrip && !ds.nameDate) updateDoc(doc.key, { nameDate: nd });
          void runFit(doc);
        }}
      >
        {busy ?? t('kit.crop.apply')}
      </Button>
    );
  } else if (screen === 'result' && doc && ds.output) {
    const out = ds.output;
    const ok = canDownload(out.checks);
    const isCert = isPdfDoc;
    title = t(ok ? 'kit.result.title' : 'kit.result.failTitle', { doc: docName });
    const next = nextDoc(doc.key);
    const failed = failedRequired(out.checks);
    const fixKey = isCert
      ? 'pdf'
      : failed.some((c) => c.rule === 'background')
        ? 'background'
        : failed.some((c) => c.rule === 'size' || c.rule === 'size1000')
          ? 'size'
          : 'other';
    const adjust = (
      <Button onClick={() => (isCert ? go('upload') : go('crop'))}>
        {t(isCert ? 'kit.result.editPages' : 'kit.result.adjust')}
      </Button>
    );
    body = (
      <div className="space-y-4">
        {isCert ? (
          <div className="card flex items-center gap-3 p-4">
            <FileBadge size={32} aria-hidden="true" className="text-primary" />
            <p>
              {doc.spec.fileName} · {plural(t, 'kit.certificate.pages', ds.sources?.length ?? 1)}
            </p>
          </div>
        ) : (
          <ResultPreview
            t={t}
            after={out.blob}
            width={out.w}
            height={out.h}
            alt={t('ui.preview.alt', { doc: docName })}
            sizeBytes={out.sizeBytes}
            compact
            onDownload={ok ? () => downloadOne(doc) : undefined}
          />
        )}
        <PassCheck
          t={t}
          checks={out.checks}
          verdict={ok ? t('kit.result.verdict', { exam }) : t('kit.result.failVerdict')}
          verdictSub={ok ? t('kit.result.verdictSub') : undefined}
        >
          <KbMeter
            t={t}
            sizeBytes={out.sizeBytes}
            minKB={doc.spec.minKB}
            maxKB={doc.spec.maxKB}
            widthPx={isCert ? undefined : out.w}
            heightPx={isCert ? undefined : out.h}
          />
          {out.warnings && out.warnings.length > 0 && (
            <ul className="space-y-1 text-sm text-muted">
              {out.warnings.map((w) => (
                <li key={w}>{t(`kit.result.warnings.${w}`)}</li>
              ))}
            </ul>
          )}
          {doc.sizeNote && (
            <p className="text-sm text-muted">
              {t('kit.result.sizeNote', { note: loc(doc.sizeNote, lang) })}
            </p>
          )}
        </PassCheck>
        {!ok && (
          <div className="card space-y-3 border-error p-4" data-testid="kit-fix">
            <p className="flex gap-2">
              <TriangleAlert size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-error" />
              <span>{t(`kit.result.fix.${fixKey}`, { exam })}</span>
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {adjust}
              {!isCert && <Button onClick={retake}>{t('kit.result.retake')}</Button>}
            </div>
          </div>
        )}
        {ok && onlyKey && (
          <p className="text-sm">
            {t('kit.result.nextUpload', {
              body: preset.body,
              file: doc.spec.fileName,
              doc: docName,
            })}
          </p>
        )}
        {ok && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {adjust}
            {!onlyKey && (
              <Button variant="ghost" onClick={() => downloadOne(doc)}>
                <Download size={18} aria-hidden="true" />
                {t('kit.result.download')}
              </Button>
            )}
          </div>
        )}
      </div>
    );
    action = onlyKey ? (
      // One document from its own page: the file itself is the goal, so download is primary.
      <Button variant="primary" block disabled={!ok} onClick={() => downloadOne(doc)}>
        <Download size={20} aria-hidden="true" />
        {t('kit.summary.downloadFile', { file: doc.spec.fileName })}
      </Button>
    ) : (
      <Button
        variant="primary"
        block
        disabled={!ok}
        onClick={() => (next ? openDoc(next) : go('summary', null))}
      >
        {next ? t('kit.result.next', { doc: loc(next.spec.label, lang) }) : t('kit.result.finish')}
      </Button>
    );
  } else if (screen === 'summary') {
    const readyItems = doneItems();
    const n = readyItems.length;
    const total = docs.length;
    const oneFile = n === 1 && total === 1;
    title =
      n === total ? plural(t, 'kit.summary.titleAll', n) : t('kit.summary.titleSome', { n, total });
    const items = docs.map((d) => ({ doc: d, output: kit.docs[d.key]?.output }));
    body = (
      <div className="space-y-4">
        {n > 0 && (
          <section className="card border-success p-4" aria-labelledby="kit-next-h">
            <Sub id="kit-next-h" className="text-lg font-bold">
              {t('kit.summary.nextTitle')}
            </Sub>
            <ol className="mt-2 list-decimal space-y-2 pl-5">
              <li>{t(oneFile ? 'kit.summary.nextOne' : 'kit.summary.nextZip')}</li>
              {!oneFile && <li>{t('kit.summary.nextOpen')}</li>}
              <li>
                {t(n === 1 ? 'kit.summary.nextUploadOne' : 'kit.summary.nextUpload', {
                  body: preset.body,
                })}
                <ul className="mt-1 space-y-0.5 text-sm">
                  {readyItems.map(({ doc: d }) => (
                    <li key={d.key} className="font-semibold">
                      {t('kit.summary.fileFor', {
                        file: d.spec.fileName,
                        doc: loc(d.spec.label, lang),
                      })}
                    </li>
                  ))}
                </ul>
              </li>
            </ol>
          </section>
        )}
        <SummaryGrid
          t={t}
          lang={lang}
          items={items}
          onDownload={downloadOne}
          onRedo={(d) => openDoc(d)}
        />
        <ShareButton
          block
          label={t('kit.summary.share')}
          title={t('kit.summary.shareTitle', { exam })}
          getFiles={shareFilesList}
          onShared={() => {
            track('kit_zip_downloaded', { exam: slug, docs: n, via: 'share' });
            markFeedback();
          }}
        />
        <TrustLine text={t('common.trustLine')} />
        <div className="pt-2 text-center">
          <Button variant="ghost" onClick={() => setConfirmOpen(true)}>
            {t('common.actions.startOver')}
          </Button>
        </div>
        {promo && <div className="pt-4">{promo}</div>}
      </div>
    );
    action = oneFile ? (
      // A one-file kit: a ZIP would only add an unzip step on the phone.
      <Button variant="primary" block onClick={() => downloadOne(readyItems[0]!.doc)}>
        <Download size={20} aria-hidden="true" />
        {t('kit.summary.downloadFile', { file: readyItems[0]!.doc.spec.fileName })}
      </Button>
    ) : (
      <Button variant="primary" block busy={busy !== null} disabled={n === 0} onClick={downloadZip}>
        <Download size={20} aria-hidden="true" />
        {busy ?? t('common.actions.downloadAll')}
      </Button>
    );
  } else {
    // Unknown doc or missing output (e.g. stale): back to the checklist.
    title = t('kit.checklist.title', { exam });
    body = (
      <Button variant="primary" onClick={() => go('checklist', null)}>
        {t('kit.header.backToList')}
      </Button>
    );
  }

  const Heading = showHeader ? 'h1' : 'h2';
  const inStep = screen === 'upload' || screen === 'crop' || screen === 'result';
  // In-flow way back to the document list (the Kit page header's arrow leaves the kit).
  const listLink = (
    <Button variant="ghost" className="-mr-2 shrink-0" onClick={() => go('checklist', null)}>
      <ChevronLeft size={20} aria-hidden="true" />
      {t('kit.header.backToList')}
    </Button>
  );
  const steps: StepState[] = docs.map((d) =>
    d === doc ? 'current' : kit.docs[d.key]?.status === 'done' ? 'done' : 'todo',
  );

  return (
    <div
      className={`mx-auto flex w-full max-w-xl flex-col ${showHeader ? 'min-h-screen-safe' : ''}`}
      data-screen={screen}
      data-ready={ready ? '1' : '0'}
    >
      {showHeader && (
        <header className="sticky top-0 z-20 flex min-h-[56px] items-center gap-2 border-b border-border bg-surface px-2">
          {screen === 'checklist' ? (
            <ButtonLink
              href={examHref ?? `/exam/${slug}`}
              variant="ghost"
              aria-label={t('kit.header.backToExam', { exam })}
            >
              <ChevronLeft size={22} aria-hidden="true" />
            </ButtonLink>
          ) : (
            <Button variant="ghost" onClick={back} aria-label={t('common.actions.back')}>
              <ChevronLeft size={22} aria-hidden="true" />
            </Button>
          )}
          <p className="min-w-0 flex-1 truncate font-semibold">{t('kit.header.exam', { exam })}</p>
          <p className="shrink-0 pr-2 text-sm tabular-nums text-muted">
            {t('ui.progress.label', { done: doneCount, total: docs.length })}
          </p>
        </header>
      )}

      <div className={`flex-1 space-y-4 pb-6 pt-4 ${showHeader ? 'px-4' : ''}`}>
        {!showHeader &&
          !onlyKey &&
          screen !== 'checklist' &&
          !(doc && docs.length > 1 && inStep) &&
          listLink}
        {doc && inStep && (
          <StepProgress
            t={t}
            step={stepIndex}
            total={docs.length}
            docName={docName}
            done={doneCount}
            states={steps}
            aside={!showHeader && !onlyKey ? listLink : null}
          />
        )}
        <Heading
          ref={headingRef}
          tabIndex={-1}
          className="text-2xl font-bold leading-tight focus:outline-none"
        >
          {title}
        </Heading>
        {notice.noPersist && ready && (
          <p className="rounded-card border border-border-strong p-3 text-sm">
            {t('kit.checklist.noPersist')}
          </p>
        )}
        {notice.restored && screen === 'checklist' && (
          <p className="rounded-card bg-bg p-3 text-sm">{t('kit.checklist.restored')}</p>
        )}
        {notice.stale && (
          <p className="rounded-card border border-primary p-3 text-sm">
            {t('kit.checklist.staleNotice')}
          </p>
        )}
        {error && (
          <div role="alert" className="space-y-3 rounded-card border border-error p-3">
            <p className="flex gap-2 text-error-text">
              <TriangleAlert size={20} aria-hidden="true" className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </p>
            {doc && !isPdfDoc && (screen === 'crop' || screen === 'result') && (
              <Button onClick={retake}>{t('kit.result.retake')}</Button>
            )}
          </div>
        )}
        {body}
      </div>

      {action && (
        <div
          className={`sticky bottom-0 z-20 border-t border-border bg-surface/95 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur ${
            showHeader ? 'px-4' : '-mx-4 px-4'
          }`}
        >
          {action}
        </div>
      )}

      <LiveRegion message={announce} />
      <ConfirmDialog
        open={confirmOpen}
        title={t('kit.startOver.title')}
        body={t('kit.startOver.body', { exam })}
        confirmLabel={t('kit.startOver.confirm')}
        cancelLabel={t('kit.startOver.cancel')}
        onConfirm={startOver}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
