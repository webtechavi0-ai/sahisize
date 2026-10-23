/**
 * PLAN 4 Phase 4 #2, R7, QUESTIONS Q10: zero CSP violations on every route type, including
 * WASM compile and engine-worker start (a real auto-fit), pdf.js and libheif.
 *
 * `astro preview` does not read public/_headers, so every response is replayed with the
 * headers Cloudflare Pages would add (tests/security/cf-pages.ts). The page therefore runs
 * under BOTH the hashed <meta> policy and the header policies (frame-ancestors, the engine
 * worker's own CSP), exactly as in production.
 *
 * Violations are caught two ways: a `securitypolicyviolation` listener installed before any
 * page script (document scope), and console messages from the browser's CSP reporting,
 * which also cover dedicated workers (their violation events never reach the document).
 */
import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { fixture } from '../e2e/helpers/app';
import { HEADER_CSP, STYLE_ATTR_DIRECTIVE } from '../../src/config/csp';
import { readHeaders, headersFor } from './cf-pages';

interface Violation {
  url: string;
  directive: string;
  blocked: string;
  source?: string;
  sample?: string;
}

const HEADER_RULES = readHeaders();
const CSP_CONSOLE =
  /Content[- ]Security[- ]Policy|Refused to (load|execute|apply|connect|create|compile|frame|evaluate)/i;

/** Replay the Pages headers and collect violations for this context. */
async function guard(context: BrowserContext) {
  const violations: Violation[] = [];
  const consoleHits: string[] = [];
  const served: string[] = [];

  await context.exposeBinding('__reportCspViolation', (_src, v: Violation) => {
    violations.push(v);
  });
  await context.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) => {
      (window as unknown as { __reportCspViolation: (v: unknown) => void }).__reportCspViolation({
        url: location.pathname,
        directive: e.effectiveDirective || e.violatedDirective,
        blocked: e.blockedURI,
        source: e.sourceFile ? `${e.sourceFile}:${e.lineNumber}` : undefined,
        sample: e.sample,
      });
    });
  });
  await context.route('**/*', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const ours = url.origin === new URL(test.info().project.use.baseURL!).origin;
    if (!/^https?:$/.test(url.protocol) || !ours) return route.continue();
    const res = await route.fetch();
    const headers = { ...res.headers() };
    for (const [k, v] of headersFor(HEADER_RULES, url)) headers[k] = v;
    served.push(url.pathname);
    await route.fulfill({ response: res, headers });
  });
  const watch = (page: Page) =>
    page.on('console', (m) => {
      if (CSP_CONSOLE.test(m.text())) consoleHits.push(`${page.url()}: ${m.text()}`);
    });
  context.pages().forEach(watch);
  context.on('page', watch);
  return { violations, consoleHits, served };
}

type Guard = Awaited<ReturnType<typeof guard>>;

function expectClean(g: Guard) {
  expect(g.violations, 'securitypolicyviolation events').toEqual([]);
  expect(g.consoleHits, 'CSP console reports').toEqual([]);
}

/** Load a page, scroll it so client:visible islands hydrate, let it settle. */
async function visit(page: Page, path: string) {
  const res = await page.goto(path, { waitUntil: 'load' });
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(300);
  return res;
}

test.describe('CSP: zero violations', () => {
  // Header replay needs routing; a service worker would answer requests behind its back.
  test.use({ serviceWorkers: 'block' });

  const STATIC_ROUTES: [type: string, path: string][] = [
    ['home', '/'],
    ['exams index', '/exams'],
    ['exam', '/exam/ibps-po'],
    ['document', '/exam/ibps-po/photo'],
    ['hub', '/exams/ibps'],
    ['tools index', '/tools'],
    ['guides index', '/guides'],
    ['guide', '/guides/exam-form-checklist'],
    ['id-documents index', '/id-documents'],
    ['id-document', '/id-documents/pan-card-photo-size'],
    ['legal', '/privacy'],
    ['report', '/report'],
    ['sources', '/sources'],
    ['hi home', '/hi'],
    ['hi exam', '/hi/exam/ibps-po'],
    ['hi kit', '/hi/kit/ibps-po'],
    ['hi tool', '/hi/tools/compress-image-to-20kb'],
    ['hi id-document', '/hi/id-documents/pan-card-photo-size'],
    ['offline', '/offline'],
  ];

  for (const [type, path] of STATIC_ROUTES) {
    test(`${type} ${path}`, async ({ page, context }) => {
      const g = await guard(context);
      const res = await visit(page, path);
      expect(res?.status(), path).toBe(200);
      // The header policy really is applied on top of the meta one.
      expect(res?.headers()['content-security-policy']).toBe(HEADER_CSP);
      const meta = page.locator('meta[http-equiv="content-security-policy" i]');
      await expect(meta).toHaveCount(1);
      const policy = (await meta.getAttribute('content')) ?? '';
      expect(policy).toContain("script-src 'self' 'wasm-unsafe-eval' 'sha256-");
      expect(policy).toContain(STYLE_ATTR_DIRECTIVE);
      expect(policy, 'no plain unsafe-eval in the page policy').not.toMatch(/\s'unsafe-eval'/);
      expectClean(g);
    });
  }

  test('detector self-check: a blocked inline script and image are reported', async ({
    page,
    context,
  }) => {
    const g = await guard(context);
    await visit(page, '/');
    await page.evaluate(() => {
      const s = document.createElement('script');
      s.textContent = 'window.__pwned = 1';
      document.body.append(s);
      const i = document.createElement('img');
      i.src = 'https://example.invalid/pixel.png';
      document.body.append(i);
    });
    await expect
      .poll(() => g.violations.map((v) => v.directive).sort())
      .toEqual(expect.arrayContaining(['img-src', 'script-src-elem']));
    expect(await page.evaluate(() => (window as { __pwned?: number }).__pwned)).toBeUndefined();
  });

  test('404 page', async ({ page, context }) => {
    const g = await guard(context);
    const res = await visit(page, '/this-page-does-not-exist');
    expect(res?.status()).toBe(404);
    expectClean(g);
  });

  test('kit: auto-fit compiles WASM in the engine worker @smoke', async ({ page, context }) => {
    const g = await guard(context);
    await page.goto('/kit/ibps-po');
    await page.waitForSelector('[data-ready="1"]');
    const action = page.locator('div.sticky.bottom-0 button').first();
    const screen = () => page.getAttribute('[data-screen]', 'data-screen');
    const leave = (s: string) =>
      page.waitForFunction(
        (x) => document.querySelector('[data-screen]')?.getAttribute('data-screen') !== x,
        s,
        { timeout: 90_000 },
      );
    let reached = false;
    for (let i = 0; i < 10 && !reached; i++) {
      const s = await screen();
      if (s === 'checklist') {
        await action.click();
        await leave('checklist');
      } else if (s === 'upload') {
        await page
          .locator('[data-testid="gallery-input"]')
          .first()
          .setInputFiles(fixture('photo.jpg'));
        await leave('upload');
      } else if (s === 'crop') {
        await expect(action).toBeEnabled({ timeout: 90_000 });
        await action.click();
        await leave('crop');
      } else if (s === 'result') {
        reached = true;
      } else throw new Error(`unexpected kit screen ${s}`);
    }
    expect(reached, 'photo fit reached the result screen').toBe(true);
    // Pass rows sit under the folded "Details" of the kit's verdict card.
    await expect(page.locator('li[data-rule]').first()).toBeAttached();
    expect(
      g.served.filter((p) => p.endsWith('.wasm')),
      'engine fetched its WASM',
    ).not.toEqual([]);
    expect(
      g.served.filter((p) => p.startsWith('/_astro/workers/')),
      'engine worker started',
    ).not.toEqual([]);
    expectClean(g);
  });

  test('tool: compress to 20 KB (engine worker)', async ({ page, context }) => {
    const g = await guard(context);
    await runToolOnce(page, '/tools/compress-image-to-20kb', fixture('photo.jpg'));
    expectClean(g);
  });

  test('tool: convert HEIC (libheif)', async ({ page, context }) => {
    const g = await guard(context);
    await runToolOnce(page, '/tools/convert-image', fixture('photo.heic'));
    expectClean(g);
  });

  test('tool: compress PDF (pdf.js main thread + its worker)', async ({ page, context }) => {
    const g = await guard(context);
    await runToolOnce(page, '/tools/compress-pdf', fixture('scan.pdf'), /^Compress/);
    expect(
      g.served.filter((p) => p.startsWith('/_astro/pdf.worker')),
      'pdf.js worker loaded',
    ).not.toEqual([]);
    expectClean(g);
  });

  test('id-document: PAN photo tool', async ({ page, context }) => {
    const g = await guard(context);
    await visit(page, '/id-documents/pan-card-photo-size');
    const input = page.locator('[data-testid="gallery-input"]').first();
    await input.setInputFiles(fixture('photo.jpg'));
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(3000);
    expectClean(g);
  });
});

async function runToolOnce(page: Page, path: string, file: string, action?: RegExp) {
  await page.goto(path);
  const island = page
    .locator('astro-island', { has: page.locator('[data-testid="gallery-input"]') })
    .last();
  await island.scrollIntoViewIfNeeded();
  await expect(island).not.toHaveAttribute('ssr', /.*/, { timeout: 30_000 });
  await page.locator('[data-testid="gallery-input"]').first().setInputFiles(file);
  if (action) {
    const btn = page.getByRole('button', { name: action }).first();
    await expect(btn).toBeEnabled({ timeout: 60_000 });
    await btn.click();
  }
  await expect(page.locator('section[aria-labelledby="tool-result-h"]')).toBeVisible({
    timeout: 90_000,
  });
}

test.describe('CSP with the service worker', () => {
  test('home registers the service worker and precaches without violations', async ({
    page,
    context,
  }) => {
    const violations: unknown[] = [];
    const consoleHits: string[] = [];
    await context.exposeBinding('__reportCspViolation', (_s, v) => void violations.push(v));
    await context.addInitScript(() =>
      document.addEventListener('securitypolicyviolation', (e) =>
        (window as unknown as { __reportCspViolation: (v: unknown) => void }).__reportCspViolation({
          directive: e.effectiveDirective,
          blocked: e.blockedURI,
        }),
      ),
    );
    page.on('console', (m) => CSP_CONSOLE.test(m.text()) && consoleHits.push(m.text()));
    await page.goto('/');
    const active = await page.evaluate(async () => {
      const reg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<null>((r) => setTimeout(() => r(null), 30_000)),
      ]);
      return !!reg?.active;
    });
    expect(active, 'service worker activated').toBe(true);
    await page.goto('/offline');
    await page.waitForLoadState('networkidle').catch(() => {});
    expect(violations).toEqual([]);
    expect(consoleHits).toEqual([]);
  });
});
