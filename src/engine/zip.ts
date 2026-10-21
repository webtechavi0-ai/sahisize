/**
 * ZIP with fflate (SPEC 7.7). Already-compressed files (JPEG/PNG/WebP/PDF) are stored
 * (level 0); README.txt is deflated. README.txt gets a file listing with sizes: put
 * `{{files}}` in the readme text to place it, otherwise it is appended.
 */
import { strToU8, zipSync, type Zippable } from 'fflate';
import type { Bytes, ZipEntry } from './types';

const STORED = /\.(jpe?g|png|webp|pdf|heic|zip|gif)$/i;

/** Make names unique within the archive: "sign.jpg", "sign (2).jpg". */
export function uniqueNames(names: string[]): string[] {
  const seen = new Map<string, number>();
  return names.map((raw) => {
    const name = raw.replace(/[\\/:*?"<>|]+/g, '_').trim() || 'file';
    const key = name.toLowerCase();
    const n = (seen.get(key) ?? 0) + 1;
    seen.set(key, n);
    if (n === 1) return name;
    const dot = name.lastIndexOf('.');
    return dot > 0 ? `${name.slice(0, dot)} (${n})${name.slice(dot)}` : `${name} (${n})`;
  });
}

function fmtSize(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KB (${bytes} bytes; 1 KB = 1024 bytes)`;
}

export function fileListing(files: { name: string; size: number }[]): string {
  const width = Math.max(4, ...files.map((f) => f.name.length));
  return files.map((f) => `  ${f.name.padEnd(width)}  ${fmtSize(f.size)}`).join('\n');
}

export interface ReadmeInput {
  examName: string;
  files: { name: string; size: number; required?: string }[];
  sourceUrl?: string;
  sourceLabel?: string;
  lastChecked?: string;
  generatedAt?: string;
  notes?: string[];
}

/** Full README.txt text (exam name, file sizes, spec source). */
export function buildReadme(r: ReadmeInput): string {
  const lines = [
    `SahiSize - ${r.examName}`,
    '',
    'Files in this ZIP:',
    ...r.files.map((f) => `  ${f.name}  ${fmtSize(f.size)}${f.required ? `  (required: ${f.required})` : ''}`),
    '',
  ];
  if (r.sourceUrl || r.sourceLabel) {
    lines.push(`Specs source: ${[r.sourceLabel, r.sourceUrl].filter(Boolean).join(' - ')}`);
    if (r.lastChecked) lines.push(`Specs last checked: ${r.lastChecked}`);
    lines.push('');
  }
  for (const n of r.notes ?? []) lines.push(n);
  if (r.notes?.length) lines.push('');
  lines.push('Made in your browser with SahiSize. Your photos were never uploaded.');
  if (r.generatedAt) lines.push(`Created: ${r.generatedAt}`);
  return lines.join('\r\n') + '\r\n';
}

/** Fixed timestamp keeps archives reproducible (fflate needs a date >= 1980). */
const MTIME = new Date('2026-01-01T00:00:00Z');

export function buildZip(files: ZipEntry[], readme?: string): Bytes {
  const names = uniqueNames([...files.map((f) => f.name), ...(readme ? ['README.txt'] : [])]);
  const entries: Zippable = {};
  files.forEach((f, i) => {
    entries[names[i]!] = [f.bytes, { level: STORED.test(f.name) ? 0 : 6, mtime: MTIME }];
  });
  if (readme) {
    const listing = fileListing(files.map((f, i) => ({ name: names[i]!, size: f.bytes.length })));
    let text = readme.includes('{{files}}') ? readme.replace('{{files}}', listing) : `${readme.replace(/\s+$/, '')}\r\n\r\nFiles:\r\n${listing}\r\n`;
    text = text.replace(/\r?\n/g, '\r\n');
    entries[names[names.length - 1]!] = [strToU8(text), { level: 6, mtime: MTIME }];
  }
  const out = zipSync(entries);
  const copy = new Uint8Array(out.length);
  copy.set(out);
  return copy;
}
