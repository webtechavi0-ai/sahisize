/**
 * Generic driver for the standalone tool islands (src/islands/tools/**): upload fixtures
 * through the shared Uploader, optionally press the tool's action button, wait for the
 * shared ResultPanel (`#tool-result-h`) and download through its primary button.
 */
import { expect, type Locator, type Page } from '@playwright/test';
import { downloadBytes } from './app';

export interface ToolRun {
  heading: string;
  rules: Record<string, { pass: boolean; text: string }>;
  downloadEnabled: boolean;
  file?: { name: string; bytes: Uint8Array };
}

export interface ToolStep {
  /** Fixture paths for the gallery input (several for multi-file tools). */
  files: string[];
  /** Fill inputs before the action, by accessible label. */
  fill?: { label: RegExp; value: string; afterPrefill?: boolean }[];
  /** The result panel must show this before reading it (re-runs after settings changes). */
  resultText?: RegExp;
  /** Action button to press after upload (omit when the tool runs automatically). */
  action?: RegExp;
  /** Wait for this instead of the ResultPanel (e.g. batch ZIP button). */
  doneButton?: RegExp;
  timeout?: number;
}

export const resultPanel = (page: Page) => page.locator('section[aria-labelledby="tool-result-h"]');

async function readRules(scope: Locator) {
  const rules: ToolRun['rules'] = {};
  for (const li of await scope.locator('li[data-rule]').all()) {
    rules[(await li.getAttribute('data-rule'))!] = {
      pass: (await li.getAttribute('data-pass')) === 'true',
      text: (await li.innerText()).replace(/\s+/g, ' '),
    };
  }
  return rules;
}

/** Islands hydrate `client:visible`: scroll the island into view and wait for hydration. */
export async function hydrateIsland(page: Page, inner = '[data-testid="gallery-input"]') {
  const island = page.locator('astro-island', { has: page.locator(inner) }).last();
  await island.waitFor({ state: 'attached', timeout: 30_000 });
  await island.scrollIntoViewIfNeeded();
  await expect(island).not.toHaveAttribute('ssr', /.*/, { timeout: 30_000 });
}

export async function runTool(page: Page, step: ToolStep): Promise<ToolRun> {
  const timeout = step.timeout ?? 90_000;
  await hydrateIsland(page);
  const input = page.locator('[data-testid="gallery-input"]').first();
  await input.setInputFiles(step.files);
  for (const f of step.fill ?? []) {
    const field = page.getByLabel(f.label).first();
    // Tools may prefill from the decoded file (resize starts at the file's own px).
    if (f.afterPrefill) await expect(field).toHaveValue(/\S/, { timeout });
    await field.fill(f.value);
  }
  if (step.action) {
    const btn = page.getByRole('button', { name: step.action }).first();
    await expect(btn).toBeEnabled({ timeout });
    await btn.click();
  }
  if (step.doneButton) {
    const done = page.getByRole('button', { name: step.doneButton }).first();
    await expect(done).toBeVisible({ timeout });
    await expect(done).toBeEnabled({ timeout });
    const file = await downloadBytes(page, () => done.click(), timeout);
    return {
      heading: await done.innerText(),
      rules: await readRules(page.locator('body')),
      downloadEnabled: true,
      file,
    };
  }
  const panel = resultPanel(page);
  await expect(panel).toBeVisible({ timeout });
  if (step.resultText) await expect(panel).toContainText(step.resultText, { timeout });
  const heading = await panel.locator('#tool-result-h').innerText();
  const rules = await readRules(panel);
  const dl = panel.getByRole('button', { name: /^Download|डाउनलोड/ }).first();
  const downloadEnabled = await dl.isEnabled();
  const run: ToolRun = { heading, rules, downloadEnabled };
  if (downloadEnabled) run.file = await downloadBytes(page, () => dl.click(), timeout);
  return run;
}

/** "200×230 px" → [200, 230] from a PassCheck row. */
export function pxFromText(text: string): [number, number] | null {
  const m = /(\d+)\s*[×x]\s*(\d+)/.exec(text);
  return m ? [Number(m[1]), Number(m[2])] : null;
}
