/**
 * Filesystem access and validation errors for src/content. Node-only but framework-free
 * (no server-only marker), so scripts and tests can load and validate real content.
 * App code imports the cached, server-only modules in ../ instead.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { z } from 'zod';

/** Absolute path of src/content. Override with CONTENT_ROOT (tests, tooling). */
export function contentRoot(): string {
  return process.env.CONTENT_ROOT ?? join(process.cwd(), 'src', 'content');
}

export function contentPath(...parts: string[]): string {
  return join(contentRoot(), ...parts);
}

/** Thrown for any invalid content file; lists every problem so the build log is actionable. */
export class ContentValidationError extends Error {
  constructor(
    readonly scope: string,
    readonly problems: readonly string[],
  ) {
    super(`Invalid content: ${scope} (${problems.length} problem(s)):\n  - ${problems.join('\n  - ')}`);
    this.name = 'ContentValidationError';
  }
}

/** "src/content/presets/ibps-po.json" style label for messages. */
export function displayPath(abs: string): string {
  return relative(process.cwd(), abs) || abs;
}

export function readJson(abs: string): unknown {
  try {
    return JSON.parse(readFileSync(abs, 'utf8')) as unknown;
  } catch (e) {
    throw new ContentValidationError(displayPath(abs), [`cannot read JSON: ${(e as Error).message}`]);
  }
}

/** Sorted *.json file names in a content directory ([] when it does not exist). */
export function listJsonFiles(absDir: string): string[] {
  if (!existsSync(absDir)) return [];
  return readdirSync(absDir)
    .filter((f) => f.endsWith('.json'))
    .sort();
}

export function zodProblems(error: z.ZodError, prefix = ''): string[] {
  return error.issues.map((i) => `${prefix}${i.path.join('.') || '(root)'}: ${i.message}`);
}

/** Parse `data` with `schema` or throw a ContentValidationError naming the file. */
export function parseOrThrow<S extends z.ZodTypeAny>(schema: S, data: unknown, label: string): z.output<S> {
  const res = schema.safeParse(data);
  if (!res.success) throw new ContentValidationError(label, zodProblems(res.error));
  return res.data as z.output<S>;
}

/** Read and validate one file. */
export function loadFile<S extends z.ZodTypeAny>(schema: S, ...parts: string[]): z.output<S> {
  const abs = contentPath(...parts);
  return parseOrThrow(schema, readJson(abs), displayPath(abs));
}

/** Memoize a zero-argument loader for the life of the process (content is static). */
export function once<T>(fn: () => T): () => T {
  let done = false;
  let value: T;
  return () => {
    if (!done) {
      value = fn();
      done = true;
    }
    return value;
  };
}
