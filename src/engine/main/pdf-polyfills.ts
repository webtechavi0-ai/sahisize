/**
 * Polyfills the pdfjs 6 legacy build no longer bundles. Loaded before pdfjs on the main thread
 * (pdf-raster.ts) and in the pdf.js worker (pdf-worker.ts), so PDF tools keep working on browsers
 * older than Chrome 119 / Safari 17.4. No eval: the worker CSP forbids it.
 */
interface Resolvers<T> {
  promise: Promise<T>;
  resolve: (v: T | PromiseLike<T>) => void;
  reject: (e?: unknown) => void;
}

const PromiseCtor = Promise as unknown as { withResolvers?: <T>() => Resolvers<T> };
if (typeof PromiseCtor.withResolvers !== 'function') {
  Object.defineProperty(Promise, 'withResolvers', {
    configurable: true,
    writable: true,
    value: function withResolvers<T>(): Resolvers<T> {
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

// Used by the pdf.js worker when it substitutes system fonts. A copy is enough: pdfjs never
// touches the source buffer again.
const abProto = ArrayBuffer.prototype as unknown as { transferToFixedLength?: (n?: number) => ArrayBuffer };
if (typeof abProto.transferToFixedLength !== 'function') {
  Object.defineProperty(ArrayBuffer.prototype, 'transferToFixedLength', {
    configurable: true,
    writable: true,
    value: function transferToFixedLength(this: ArrayBuffer, n?: number): ArrayBuffer {
      const len = n === undefined ? this.byteLength : n;
      const out = new ArrayBuffer(len);
      new Uint8Array(out).set(new Uint8Array(this, 0, Math.min(len, this.byteLength)));
      return out;
    },
  });
}

export {};
