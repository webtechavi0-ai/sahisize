/**
 * SPEC 5.3 + 16: "no request ever carries image bytes". Every request in the context is
 * intercepted while real files go through the kit and the tools. Fails on any body over
 * 1 KB, any body with JPEG/PNG/PDF magic (raw, hex or base64), or any host that is neither
 * first-party nor the configured analytics host.
 */
import { test, expect } from '@playwright/test';
import { attachJson, fixture, routeExists } from './helpers/app';
import { bodyViolations, NetworkGuard } from './helpers/network';
import { runKit } from './helpers/kit';
import { runTool } from './helpers/tools';

test.describe('privacy: no file bytes leave the device', () => {
  test('guard self-check: detects magic bytes and big bodies', () => {
    expect(bodyViolations(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toContain(
      'body contains JPEG magic',
    );
    expect(bodyViolations(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toContain(
      'body contains PNG magic',
    );
    expect(bodyViolations(new TextEncoder().encode('%PDF-1.7'))).toContain(
      'body contains PDF magic',
    );
    expect(bodyViolations(new TextEncoder().encode('{"img":"/9j/4AAQ"}'))).toContain(
      'body contains JPEG base64 signature',
    );
    expect(bodyViolations(new Uint8Array(1025))).toContain('body 1025 B > 1024 B');
    expect(
      bodyViolations(new TextEncoder().encode('{"name":"fit_done","props":{"ms":812}}')),
    ).toEqual([]);
  });

  test('full IBPS PO kit + ZIP', async ({ page, context, baseURL }, info) => {
    test.setTimeout(240_000);
    const guard = new NetworkGuard(context, baseURL!);
    const run = await runKit(page, 'ibps-po', {
      photo: fixture('photo.jpg'),
      signature: fixture('signature.png'),
      thumb: fixture('thumb.jpg'),
      declaration: fixture('declaration.jpg'),
      certificate: fixture('declaration.jpg'),
    });
    expect(run.final).toBe('summary');
    const zip = page.locator('div.sticky.bottom-0 button').first();
    if (await zip.isEnabled()) {
      await Promise.all([page.waitForEvent('download'), zip.click()]);
    }
    // Let late beacons (pagehide, analytics) go out.
    await page.goto('/');
    await attachJson(info, 'requests', guard.seen);
    expect(guard.violations, JSON.stringify(guard.violations, null, 1)).toEqual([]);
    // The guard must see worker traffic too: the engine's WASM is fetched from the worker.
    expect(
      guard.seen.some((r) => /\.wasm(\?|$)/.test(r.url)),
      'worker requests observed',
    ).toBe(true);
  });

  const tools: { route: string; files: string[]; action?: RegExp; doneButton?: RegExp }[] = [
    { route: '/tools/compress-image-to-20kb', files: [fixture('photo.jpg')] },
    { route: '/tools/convert-image', files: [fixture('photo.heic')] },
    {
      route: '/tools/images-to-pdf',
      files: [fixture('photo.jpg'), fixture('declaration.jpg')],
      action: /^Make PDF/,
    },
    { route: '/tools/compress-pdf', files: [fixture('scan.pdf')], action: /^Compress/ },
    { route: '/tools/signature-resize', files: [fixture('signature.png')], action: /^Auto-fit$/ },
    {
      route: '/tools/batch-compress',
      files: [fixture('photo.jpg'), fixture('thumb.jpg')],
      action: /^Compress 2/,
      doneButton: /\(ZIP\)/,
    },
    { route: '/id-documents/pan-card-photo-size', files: [fixture('photo.jpg')], action: /^Auto-fit$/ },
    { route: '/id-documents/pan-card-signature-size', files: [fixture('signature.png')], action: /^Auto-fit$/ },
    { route: '/hi/id-documents/pan-card-photo-size', files: [fixture('photo.jpg')], action: /^Auto-fit$/ },
  ];
  for (const t of tools) {
    test(`tool ${t.route}`, async ({ page, context, baseURL }, info) => {
      test.skip(!routeExists(t.route), 'route not built yet');
      const guard = new NetworkGuard(context, baseURL!);
      await page.goto(t.route);
      await runTool(page, { files: t.files, action: t.action, doneButton: t.doneButton });
      await page.goto('/');
      await attachJson(info, 'requests', guard.seen);
      expect(guard.violations, JSON.stringify(guard.violations, null, 1)).toEqual([]);
    });
  }

  test('name and date on photo: the typed name never leaves the device', async ({ page, context, baseURL }, info) => {
    const route = '/tools/name-date-on-photo';
    test.skip(!routeExists(route), 'route not built yet');
    const guard = new NetworkGuard(context, baseURL!);
    const sent: string[] = [];
    context.on('request', (r) => sent.push(`${r.url()} ${r.postData() ?? ''}`));
    await page.goto(route);
    await runTool(page, {
      files: [fixture('photo.jpg')],
      fill: [{ label: /^Name to print/, value: 'Zorawar Qwyx' }],
      action: /^Add name and date$/,
    });
    await page.goto('/');
    await attachJson(info, 'requests', guard.seen);
    expect(guard.violations, JSON.stringify(guard.violations, null, 1)).toEqual([]);
    const dec = (s: string) => {
      try {
        return decodeURIComponent(s);
      } catch {
        return s;
      }
    };
    expect(sent.filter((s) => /Zorawar|Qwyx/i.test(dec(s)))).toEqual([]);
  });

  test('content pages load nothing from third parties', async ({ page, context, baseURL }) => {
    const guard = new NetworkGuard(context, baseURL!);
    for (const r of [
      '/',
      '/exams',
      '/exam/ibps-po',
      '/guides',
      '/sources',
      '/hi',
      '/privacy',
      '/report',
    ]) {
      await page.goto(r);
      await page.waitForLoadState('networkidle');
    }
    expect(guard.violations, JSON.stringify(guard.violations, null, 1)).toEqual([]);
  });
});
