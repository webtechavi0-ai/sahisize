/**
 * pdf.js worker entry: polyfills first, then the pdfjs legacy worker (which starts listening on
 * `self` when it loads). Built by Vite as /_astro/pdf.worker-[hash].js (astro.config.mjs), so the
 * no-eval worker CSP in public/_headers applies to it.
 */
import './pdf-polyfills';
import 'pdfjs-dist/legacy/build/pdf.worker.min.mjs';
