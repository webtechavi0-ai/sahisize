/**
 * `npm run presets:check` (SPEC 8.4): lists presets whose `lastChecked` is older
 * than 120 days, and presets whose notification season starts within 30 days
 * (or is running now), so they can be re-verified before candidates arrive.
 *
 * Flags:
 *   --today=YYYY-MM-DD  pretend today is this date (default: real date)
 *   --all               include hidden (published: false) presets
 *   --strict            exit 1 when any preset is stale
 */
import { pathToFileURL } from 'node:url';
import { loadPresetsFromFs, type ExamPreset } from '../src/content/presets/index';

export const STALE_DAYS = 120;
export const SOON_DAYS = 30;
const DAY = 86_400_000;

/** Group months into consecutive runs, wrapping December → January. [12,1,7] → [[12,1],[7]]. */
export function monthRuns(months: readonly number[]): number[][] {
  const set = new Set(months);
  const runs: number[][] = [];
  const seen = new Set<number>();
  for (const m of [...set].sort((a, b) => a - b)) {
    if (seen.has(m)) continue;
    // Walk back to the start of this run (wrapping), then forward.
    let start = m;
    for (
      let i = 0;
      i < 12 && set.has(((start + 10) % 12) + 1) && ((start + 10) % 12) + 1 !== m;
      i++
    )
      start = ((start + 10) % 12) + 1;
    const run: number[] = [];
    let cur = start;
    while (set.has(cur) && !seen.has(cur)) {
      run.push(cur);
      seen.add(cur);
      cur = (cur % 12) + 1;
    }
    runs.push(run);
  }
  return runs;
}

export type SeasonStatus =
  | { kind: 'now'; months: number[] }
  | { kind: 'soon'; months: number[]; days: number; starts: string };

/** Whether a season is running now or starts within SOON_DAYS of `today` (UTC). */
export function seasonStatus(months: readonly number[], today: Date): SeasonStatus | null {
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth() + 1;
  const t0 = Date.UTC(y, today.getUTCMonth(), today.getUTCDate());
  let best: SeasonStatus | null = null;
  for (const run of monthRuns(months)) {
    if (run.includes(m)) return { kind: 'now', months: run };
    const first = run[0]!;
    const startYear = first > m ? y : y + 1;
    const start = Date.UTC(startYear, first - 1, 1);
    const days = Math.round((start - t0) / DAY);
    if (days <= SOON_DAYS && (!best || (best.kind === 'soon' && days < best.days))) {
      best = {
        kind: 'soon',
        months: run,
        days,
        starts: new Date(start).toISOString().slice(0, 10),
      };
    }
  }
  return best;
}

export function daysSince(iso: string, today: Date): number {
  const t0 = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.round((t0 - Date.parse(`${iso}T00:00:00Z`)) / DAY);
}

export interface CheckReport {
  stale: { slug: string; lastChecked: string; days: number }[];
  season: { slug: string; status: SeasonStatus }[];
}

export function checkPresets(presets: readonly ExamPreset[], today: Date): CheckReport {
  const stale = presets
    .map((p) => ({
      slug: p.slug,
      lastChecked: p.lastChecked,
      days: daysSince(p.lastChecked, today),
    }))
    .filter((r) => r.days > STALE_DAYS)
    .sort((a, b) => b.days - a.days);
  const season = presets
    .map((p) => ({ slug: p.slug, status: seasonStatus(p.seasonMonths, today) }))
    .filter((r): r is { slug: string; status: SeasonStatus } => r.status !== null)
    .sort(
      (a, b) =>
        (a.status.kind === 'now' ? -1 : a.status.days) -
          (b.status.kind === 'now' ? -1 : b.status.days) || a.slug.localeCompare(b.slug),
    );
  return { stale, season };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtRun = (run: number[]) => run.map((m) => MONTHS[m - 1]).join('–');

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const todayArg = args.find((a) => a.startsWith('--today='))?.slice(8);
  const today = todayArg ? new Date(`${todayArg}T00:00:00Z`) : new Date();
  if (Number.isNaN(today.getTime())) throw new Error(`bad --today: ${todayArg}`);

  const all = await loadPresetsFromFs();
  const presets = args.includes('--all') ? all : all.filter((p) => p.published);
  const { stale, season } = checkPresets(presets, today);
  const date = today.toISOString().slice(0, 10);

  console.log(
    `presets:check ${date}: ${presets.length} presets (${all.length} total, ${all.filter((p) => p.published).length} published)\n`,
  );

  console.log(`Stale (lastChecked older than ${STALE_DAYS} days): ${stale.length}`);
  for (const r of stale)
    console.log(`  ${r.slug.padEnd(24)} lastChecked ${r.lastChecked} (${r.days} days)`);

  console.log(`\nSeason running now or starting within ${SOON_DAYS} days: ${season.length}`);
  for (const r of season) {
    const s = r.status;
    const when = s.kind === 'now' ? 'in season now' : `starts ${s.starts} (in ${s.days} days)`;
    console.log(`  ${r.slug.padEnd(24)} ${fmtRun(s.months).padEnd(12)} ${when}`);
  }
  if (season.length)
    console.log('\n→ Re-verify these against the newest notification before the rush.');

  if (args.includes('--strict') && stale.length) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e: unknown) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
