/**
 * Generate missing source illustrations with the OpenAI Images API.
 *
 *   OPENAI_API_KEY=sk-... npm run images:generate                  # every slot without a source PNG
 *   npm run images:generate -- --only home-hero                     # one slot (comma list or repeat)
 *   npm run images:generate -- --only home-hero --force             # regenerate even if a PNG exists
 *   npm run images:generate -- --dry-run                            # print requests; no key, no network
 *   npm run images:generate -- --quality low                        # cheap drafts for prompt tuning
 *
 * Env: OPENAI_API_KEY (required unless --dry-run), OPENAI_IMAGE_MODEL (default gpt-image-2),
 *      OPENAI_ORG_ID / OPENAI_PROJECT_ID (optional headers).
 *
 * Writes assets/images/source/<id>.png plus <id>.json (model, size, quality, prompt hash), at most
 * two requests in flight, retrying 408/409/429/5xx and network errors with backoff. It is a paid,
 * manual step: it refuses to run in CI or from an npm build lifecycle, and nothing in the build
 * calls it. New images still need a human review (status "review" -> "approved") before
 * `npm run images:optimize` publishes them. See docs/design/image-pipeline.md.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  DEFAULT_IMAGE_MODEL,
  OPENAI_IMAGES_URL,
  SOURCE_DIR,
  backoffMs,
  buildGenerationRequest,
  isRetryableStatus,
  loadManifest,
  mapPool,
  parseArgs,
  selectSlots,
  sourcePath,
} from './lib.mjs';

const CONCURRENCY = 2;
const MAX_RETRIES = 4;
const REQUEST_TIMEOUT_MS = 240_000;

function fail(message) {
  console.error(`images:generate: ${message}`);
  process.exit(1);
}

function guardEnvironment() {
  const lifecycle = process.env.npm_lifecycle_event ?? '';
  if (/(^|:)(pre|post)?build$/.test(lifecycle) || lifecycle === 'verify' || lifecycle.startsWith('verify:')) {
    fail(`refusing to run inside "npm run ${lifecycle}". Image generation is a manual, paid step.`);
  }
  if (process.env.CI && process.env.CI !== 'false') {
    fail('refusing to run in CI (CI is set). Generate locally, review, then commit the PNGs.');
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function requestImage(body, { apiKey, id }) {
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
  if (process.env.OPENAI_ORG_ID) headers['OpenAI-Organization'] = process.env.OPENAI_ORG_ID;
  if (process.env.OPENAI_PROJECT_ID) headers['OpenAI-Project'] = process.env.OPENAI_PROJECT_ID;

  for (let attempt = 0; ; attempt++) {
    let res;
    try {
      res = await fetch(OPENAI_IMAGES_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (err) {
      if (attempt >= MAX_RETRIES) throw new Error(`network error after ${attempt + 1} attempts: ${err.message}`);
      const wait = backoffMs(attempt);
      console.warn(`  ${id}: network error (${err.message}); retry ${attempt + 1}/${MAX_RETRIES} in ${wait} ms`);
      await sleep(wait);
      continue;
    }

    if (res.ok) {
      const json = await res.json();
      const item = json?.data?.[0];
      if (!item?.b64_json) throw new Error('response had no data[0].b64_json');
      return { png: Buffer.from(item.b64_json, 'base64'), revisedPrompt: item.revised_prompt, usage: json.usage };
    }

    const text = await res.text().catch(() => '');
    let message = text.slice(0, 500);
    try {
      message = JSON.parse(text)?.error?.message ?? message;
    } catch {
      /* not JSON */
    }
    if (isRetryableStatus(res.status) && attempt < MAX_RETRIES) {
      const wait = backoffMs(attempt, res.headers.get('retry-after'));
      console.warn(`  ${id}: HTTP ${res.status} (${message}); retry ${attempt + 1}/${MAX_RETRIES} in ${wait} ms`);
      await sleep(wait);
      continue;
    }
    if (res.status === 401) throw new Error('HTTP 401: OPENAI_API_KEY was rejected. Check the key and its project.');
    if (res.status === 403) {
      throw new Error(`HTTP 403: ${message} (GPT Image models may need API organization verification)`);
    }
    throw new Error(`HTTP ${res.status}: ${message}`);
  }
}

function isPng(buf) {
  return buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
}

async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    fail(err.message);
  }
  guardEnvironment();

  const manifest = loadManifest();
  const model = process.env.OPENAI_IMAGE_MODEL?.trim() || DEFAULT_IMAGE_MODEL;
  const slots = selectSlots(manifest, args.only).filter((s) => args.force || !existsSync(sourcePath(s.id)));

  if (!slots.length) {
    console.log('images:generate: nothing to do (every selected slot already has a source PNG; use --force to redo).');
    return;
  }

  const requests = slots.map((slot) => ({ slot, body: buildGenerationRequest(manifest, slot, { model, quality: args.quality }) }));

  if (args.dryRun) {
    console.log(`images:generate --dry-run: ${requests.length} request(s) to POST ${OPENAI_IMAGES_URL}\n`);
    for (const { slot, body } of requests) {
      console.log(`# ${slot.id} -> ${sourcePath(slot.id).replace(`${process.cwd()}/`, '')}`);
      console.log(JSON.stringify(body, null, 2));
      console.log('');
    }
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    fail(
      'OPENAI_API_KEY is not set. Export it in your shell (never commit it), e.g.\n' +
        '  export OPENAI_API_KEY=sk-...\n' +
        'or preview the requests without a key: npm run images:generate -- --dry-run',
    );
  }

  mkdirSync(SOURCE_DIR, { recursive: true });
  console.log(`images:generate: ${requests.length} image(s) with ${model}, ${CONCURRENCY} at a time`);

  const results = await mapPool(requests, CONCURRENCY, async ({ slot, body }) => {
    const started = Date.now();
    console.log(`  ${slot.id}: requesting ${body.size} ${body.quality}...`);
    const { png, revisedPrompt, usage } = await requestImage(body, { apiKey, id: slot.id });
    if (!isPng(png)) throw new Error('response is not a PNG');
    const out = sourcePath(slot.id);
    const tmp = `${out}.tmp`;
    writeFileSync(tmp, png);
    renameSync(tmp, out);
    const meta = {
      id: slot.id,
      model,
      size: body.size,
      quality: body.quality,
      background: body.background,
      promptSha256: createHash('sha256').update(body.prompt).digest('hex'),
      ...(revisedPrompt ? { revisedPrompt } : {}),
      ...(usage ? { usage } : {}),
      generatedAt: new Date().toISOString(),
    };
    writeFileSync(join(SOURCE_DIR, `${slot.id}.json`), `${JSON.stringify(meta, null, 2)}\n`);
    console.log(`  ${slot.id}: saved (${Math.round(png.length / 1024)} KB, ${((Date.now() - started) / 1000).toFixed(1)} s)`);
    return slot.id;
  });

  const ok = results.filter((r) => r.status === 'fulfilled').map((r) => r.value);
  const failed = results
    .map((r, i) => ({ r, id: requests[i].slot.id }))
    .filter(({ r }) => r.status === 'rejected');

  console.log(`\nimages:generate: ${ok.length} saved, ${failed.length} failed.`);
  for (const { r, id } of failed) console.error(`  FAILED ${id}: ${r.reason?.message ?? r.reason}`);
  if (ok.length) {
    console.log(
      '\nNext: open assets/images/source/*.png, then in src/content/images/manifest.json set each good ' +
        'slot to "status": "approved" (or "review" while undecided), and run npm run images:optimize.',
    );
  }
  if (failed.length) process.exit(1);
}

main().catch((err) => fail(err.stack ?? String(err)));
