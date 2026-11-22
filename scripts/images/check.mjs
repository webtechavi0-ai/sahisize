/**
 * Validate the image pipeline state. Offline and free; safe for CI and `npm run verify:static`.
 *
 *   npm run images:check
 *
 * Errors (exit 1):
 *   - manifest.json or generated.json fails its zod schema
 *   - a generated.json entry has no matching approved slot, or one of its files is missing
 *   - a file name's hash or width does not match its entry
 *   - an approved slot has no source PNG or no generated.json entry (run images:optimize)
 *   - a rendition file in public/img belongs to no generated.json entry
 *   - a Hindi alt text has no Devanagari
 * Warnings:
 *   - a "planned" slot already has a source PNG (review it, then set "review"/"approved")
 *   - a "review" slot has no source PNG
 *   - a slot route is not in docs/routes.txt yet
 *
 * Passes with zero generated images.
 */
import { existsSync, readdirSync } from 'node:fs';
import { PUBLIC_IMG_DIR, checkImages, loadGenerated, loadManifest, loadRoutes } from './lib.mjs';

function main() {
  let manifest;
  let generated;
  try {
    manifest = loadManifest();
    generated = loadGenerated();
  } catch (err) {
    console.error(`images:check: ${err.message}`);
    process.exit(1);
  }
  const { errors, warnings } = checkImages({
    manifest,
    generated,
    routes: loadRoutes(),
    publicImgDir: PUBLIC_IMG_DIR,
    fs: {
      exists: existsSync,
      listPublicImg: () => (existsSync(PUBLIC_IMG_DIR) ? readdirSync(PUBLIC_IMG_DIR) : []),
    },
  });
  for (const w of warnings) console.warn(`  warn: ${w}`);
  for (const e of errors) console.error(`  error: ${e}`);
  const counts = manifest.slots.reduce((acc, s) => ({ ...acc, [s.status]: (acc[s.status] ?? 0) + 1 }), {});
  const summary = Object.entries(counts)
    .map(([k, v]) => `${v} ${k}`)
    .join(', ');
  if (errors.length) {
    console.error(`images:check: FAILED with ${errors.length} error(s) (${manifest.slots.length} slots: ${summary})`);
    process.exit(1);
  }
  console.log(
    `images:check: OK (${manifest.slots.length} slots: ${summary}; ${Object.keys(generated.images).length} published; ${warnings.length} warning(s))`,
  );
}

main();
