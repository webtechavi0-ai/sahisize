/**
 * Route inventory gate: every URL the previous site served (docs/routes.txt) must still answer
 * 200 at the same path, with the right Content-Type, and the legacy-URL redirects must work.
 *
 *   npm run build && npm run check:routes          # starts .next/standalone/server.js itself
 *   BASE_URL=http://127.0.0.1:3003 npm run check:routes   # checks an already running server
 *
 * Options: --concurrency=N (default 16), --routes=path/to/routes.txt
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const arg = (name: string) =>
  process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const ROUTES_FILE = resolve(arg('routes') ?? join(ROOT, 'docs', 'routes.txt'));
const CONCURRENCY = Number(arg('concurrency') ?? 16);
const TIMEOUT_MS = 30_000;

/** Expected Content-Type (prefix match, case-insensitive) by file extension. */
function expectedType(path: string): RegExp {
  if (path.endsWith('.xml')) return /^(application|text)\/xml/i;
  if (path.endsWith('.png')) return /^image\/png/i;
  if (path.endsWith('.ico')) return /^image\/(x-icon|vnd\.microsoft\.icon)/i;
  if (path.endsWith('.svg')) return /^image\/svg\+xml/i;
  if (path.endsWith('.txt')) return /^text\/plain/i;
  if (path.endsWith('.webmanifest')) return /^application\/(manifest\+)?json/i;
  if (path.endsWith('.json')) return /^application\/json/i;
  if (path.endsWith('.js')) return /^(application|text)\/javascript/i;
  return /^text\/html/i;
}

/** Legacy URL shapes that must redirect (permanently) to the clean URL. */
const REDIRECTS: { from: string; to: string; status: number[] }[] = [
  { from: '/index.html', to: '/', status: [301, 308] },
  { from: '/hi/index.html', to: '/hi', status: [301, 308] },
  { from: '/about.html', to: '/about', status: [301, 308] },
  { from: '/exams/', to: '/exams', status: [301, 308] },
];

function readRoutes(): string[] {
  const lines = readFileSync(ROUTES_FILE, 'utf8')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
  return [...new Set(lines)];
}

async function freePort(): Promise<number> {
  return new Promise((ok, fail) => {
    const srv = createServer();
    srv.once('error', fail);
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      srv.close(() => ok(port));
    });
  });
}

async function waitHealthy(base: string, child?: ChildProcess): Promise<void> {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (child && child.exitCode !== null) throw new Error(`server exited (${child.exitCode})`);
    try {
      const res = await fetch(`${base}/healthz`);
      if (res.ok) return;
    } catch {
      // not listening yet
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`server at ${base} did not become healthy within 60 s`);
}

async function startServer(): Promise<{ base: string; child: ChildProcess }> {
  const server = join(ROOT, '.next', 'standalone', 'server.js');
  if (!existsSync(server)) {
    console.error('check-routes: .next/standalone/server.js missing. Run `npm run build` first.');
    process.exit(2);
  }
  const port = await freePort();
  const child = spawn(process.execPath, [server], {
    cwd: join(ROOT, '.next', 'standalone'),
    env: { ...process.env, PORT: String(port), HOSTNAME: '127.0.0.1', NODE_ENV: 'production' },
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  const base = `http://127.0.0.1:${port}`;
  await waitHealthy(base, child);
  return { base, child };
}

interface Failure {
  path: string;
  reason: string;
}

async function check(base: string, path: string): Promise<Failure | null> {
  try {
    const res = await fetch(base + path, {
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    await res.arrayBuffer();
    if (res.status !== 200) {
      const loc = res.headers.get('location');
      return { path, reason: `HTTP ${res.status}${loc ? ` -> ${loc}` : ''}` };
    }
    const type = res.headers.get('content-type') ?? '';
    if (!expectedType(path).test(type)) {
      return { path, reason: `Content-Type "${type || '(none)'}"` };
    }
    return null;
  } catch (err) {
    return { path, reason: (err as Error).message };
  }
}

async function checkRedirect(base: string, r: (typeof REDIRECTS)[number]): Promise<Failure | null> {
  try {
    const res = await fetch(base + r.from, { redirect: 'manual' });
    const loc = res.headers.get('location');
    const target = loc ? new URL(loc, base).pathname : null;
    if (!r.status.includes(res.status) || target !== r.to) {
      return {
        path: r.from,
        reason: `expected ${r.status.join('/')} -> ${r.to}, got ${res.status} -> ${target}`,
      };
    }
    return null;
  } catch (err) {
    return { path: r.from, reason: (err as Error).message };
  }
}

async function pool<T, R>(items: T[], n: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]!);
      }
    }),
  );
  return out;
}

async function main(): Promise<void> {
  const routes = readRoutes();
  let child: ChildProcess | undefined;
  let base = process.env.BASE_URL?.replace(/\/+$/, '');
  if (base) {
    await waitHealthy(base);
  } else {
    ({ base, child } = await startServer());
  }

  try {
    const started = Date.now();
    const results = await pool(routes, CONCURRENCY, (p) => check(base!, p));
    const redirects = await Promise.all(REDIRECTS.map((r) => checkRedirect(base!, r)));
    const failures = [...results, ...redirects].filter((f): f is Failure => f !== null);
    const secs = ((Date.now() - started) / 1000).toFixed(1);

    console.log(
      `check-routes: ${routes.length} routes + ${REDIRECTS.length} redirects against ${base} in ${secs} s`,
    );
    if (failures.length) {
      console.error(`\n${failures.length} failure(s):`);
      for (const f of failures) console.error(`  ${f.path}  ${f.reason}`);
      process.exitCode = 1;
    } else {
      console.log('All routes OK.');
    }
  } finally {
    child?.kill('SIGTERM');
  }
}

main().catch((err) => {
  console.error('check-routes:', err instanceof Error ? err.message : err);
  process.exit(1);
});
