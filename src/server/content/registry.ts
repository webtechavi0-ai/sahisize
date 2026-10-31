import 'server-only';
/**
 * The validated content graph, loaded once per server process (content is static, so a
 * process-level memo is stronger than React `cache`). The first call validates every file
 * and every cross-reference; invalid data throws and fails `next build`.
 */
import { loadContentGraph, type ContentGraph } from './core/graph';
import { once } from './core/read';

export const content: () => ContentGraph = once(loadContentGraph);

/** Preview builds: SHOW_UNPUBLISHED=1 treats hidden presets as published everywhere. */
export function showUnpublished(): boolean {
  return process.env.SHOW_UNPUBLISHED === '1';
}
