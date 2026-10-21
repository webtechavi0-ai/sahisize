/**
 * Aggregate the FULL_CORPUS shard results: `npx tsx tests/engine/helpers/corpus-report.ts`.
 */
import { formatSummary, readAllShardResults, summarize } from './corpus-run';

const { results, pdf } = readAllShardResults();
console.log(formatSummary(summarize(results, pdf), 'full corpus (all shards)'));
const bySpec = new Map<string, number[]>();
for (const r of results) bySpec.set(r.spec, [...(bySpec.get(r.spec) ?? []), r.ms]);
const slow = [...bySpec.entries()]
  .map(([k, v]) => [k, v.sort((a, b) => a - b)[Math.floor(v.length * 0.95)]!] as const)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 8);
console.log('slowest specs (p95 ms):');
for (const [k, v] of slow) console.log(`  ${v.toFixed(0).padStart(5)}  ${k}`);
