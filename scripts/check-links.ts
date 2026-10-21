/**
 * `npm run links`: broken-link check against the built site, the same way CI does it
 * (.github/workflows/ci.yml). build.format 'file' emits /exams.html next to /exams/, which
 * linkinator's file mode misresolves (false 404s), so this serves dist/ with `astro preview`
 * (clean URLs, like Cloudflare Pages) and crawls that. External links are skipped.
 * Exits non-zero when any internal link is broken or the server does not start.
 *
 * Env: LINKS_PORT (default 4329).
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';

const PORT = Number(process.env.LINKS_PORT ?? 4329);
const BASE = `http://127.0.0.1:${PORT}`;

function run(cmd: string, args: string[], opts: { detached?: boolean; quiet?: boolean } = {}): ChildProcess {
  return spawn(cmd, args, {
    stdio: opts.quiet ? 'ignore' : 'inherit',
    detached: opts.detached,
    shell: process.platform === 'win32',
  });
}

async function waitUp(timeoutMs: number): Promise<boolean> {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    try {
      const r = await fetch(`${BASE}/`);
      if (r.ok) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function main(): Promise<number> {
  if (!existsSync('dist/index.html')) {
    console.error('links: dist/ is missing; run `npm run build` first.');
    return 1;
  }
  const server = run('npx', ['astro', 'preview', '--port', String(PORT), '--host', '127.0.0.1'], {
    detached: process.platform !== 'win32',
    quiet: true,
  });
  const stop = () => {
    // Kill the whole group: the npx wrapper may already have exited while astro still runs.
    try {
      if (server.pid && process.platform !== 'win32') process.kill(-server.pid, 'SIGTERM');
      else server.kill('SIGTERM');
    } catch {
      /* already gone */
    }
  };
  process.on('exit', stop);
  try {
    if (!(await waitUp(60_000))) {
      console.error(`links: preview server did not start on ${BASE}`);
      return 1;
    }
    const portRe = `http://127\\.0\\.0\\.1:${PORT}`;
    const checker = run('npx', [
      'linkinator',
      `${BASE}/`,
      '--recurse',
      '--skip',
      `^(?!${portRe})`,
      '--verbosity',
      'error',
      '--concurrency',
      '50',
    ]);
    const code: number = await new Promise((res) => checker.on('exit', (c) => res(c ?? 1)));
    console.log(code === 0 ? 'links: no broken internal links' : `links: broken links found (exit ${code})`);
    return code;
  } finally {
    stop();
  }
}

main().then(
  (code) => process.exit(code),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
