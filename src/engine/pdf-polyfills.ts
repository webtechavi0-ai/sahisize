/**
 * Polyfills that the pdfjs 6 legacy build no longer bundles (5.x shipped them via core-js).
 * Loaded before pdfjs on the main thread (pdf-raster.ts) and in the pdf.js worker
 * (pdf-worker.ts), so PDF tools keep working on browsers older than Chrome 119 / Safari 17.4.
 * No eval: the pdf.js worker's CSP forbids it.
 */
type WithResolvers = <T>() => {
  promise: Promise<T>;
  resolve: (v: T | PromiseLike<T>) => void;
  reject: (e?: unknown) => void;
};

const P = Promise as unknown as { withResolvers?: WithResolvers };
if (typeof P.withResolvers !== 'function') {
  Object.defineProperty(Promise, 'withResolvers', {
    configurable: true,
    writable: true,
    value: function withResolvers<T>() {
      let resolve!: (v: T | PromiseLike<T>) => void;
      let reject!: (e?: unknown) => void;
      const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
      });
      return { promise, resolve, reject };
    },
  });
}

// Used by the worker when it substitutes system fonts (useSystemFonts). A copy is enough:
// pdfjs never touches the source buffer again.
const AB = ArrayBuffer.prototype as unknown as { transferToFixedLength?: (n?: number) => ArrayBuffer };
if (typeof AB.transferToFixedLength !== 'function') {
  Object.defineProperty(ArrayBuffer.prototype, 'transferToFixedLength', {
    configurable: true,
    writable: true,
    value: function transferToFixedLength(this: ArrayBuffer, n?: number) {
      const len = n === undefined ? this.byteLength : n;
      const out = new ArrayBuffer(len);
      new Uint8Array(out).set(new Uint8Array(this, 0, Math.min(len, this.byteLength)));
      return out;
    },
  });
}

export {};
