// Runs after `next build` (npm "postbuild"). Next's standalone output contains the server and
// traced node_modules but not the static assets, so copy them next to server.js:
//   .next/static -> .next/standalone/.next/static
//   public       -> .next/standalone/public
// The result is self-contained: `node .next/standalone/server.js` (npm start, Docker, CI checks).
import { cpSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const standalone = join(root, '.next', 'standalone');

if (!existsSync(join(standalone, 'server.js'))) {
  console.error(
    'prepare-standalone: .next/standalone/server.js not found (is output "standalone"?)',
  );
  process.exit(1);
}

for (const [from, to] of [
  [join(root, '.next', 'static'), join(standalone, '.next', 'static')],
  [join(root, 'public'), join(standalone, 'public')],
]) {
  if (!existsSync(from)) continue;
  rmSync(to, { recursive: true, force: true });
  cpSync(from, to, { recursive: true });
}
console.log('prepare-standalone: copied .next/static and public into .next/standalone');
