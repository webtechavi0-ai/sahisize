/**
 * pdf.js worker entry: polyfills first, then the pdfjs legacy worker (which starts listening on
 * `self` when it loads). Bundled as a module worker by Next (webpack).
 */
import './pdf-polyfills';
import 'pdfjs-dist/legacy/build/pdf.worker.min.mjs';
