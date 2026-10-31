/**
 * One-off migration: content JSON used to carry a pre-rendered `html` string (the old
 * markdown pipeline). This rewrites every file under src/content/{guides,exam-copy,hub-copy}
 * in place, replacing `html` with a typed `body: Block[]` (src/lib/blocks.ts), so no HTML
 * is stored or rendered anywhere.
 *
 *   npx tsx scripts/convert-content.ts          convert (idempotent: files without html are skipped)
 *   npx tsx scripts/convert-content.ts --check  exit 1 if any file still has html or a '<tag'
 *
 * Unknown tags throw, so nothing is silently dropped.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HTMLElement, NodeType, TextNode, parse, type Node } from 'node-html-parser';
import type { Block, Inline, ListItem } from '../src/lib/blocks';

const ROOT = fileURLToPath(new URL('../src/content/', import.meta.url));
const DIRS = ['guides', 'exam-copy', 'hub-copy'];

type Marks = Omit<Inline, 'text'>;

function isElement(n: Node): n is HTMLElement {
  return n.nodeType === NodeType.ELEMENT_NODE;
}

function tag(n: HTMLElement): string {
  return n.rawTagName.toLowerCase();
}

/** Inline nodes of an element, whitespace collapsed, adjacent runs with equal marks merged. */
function inlines(el: HTMLElement, where: string): Inline[] {
  const out: Inline[] = [];
  const push = (text: string, marks: Marks) => {
    const t = text.replace(/\s+/g, ' ');
    if (!t) return;
    const prev = out[out.length - 1];
    if (
      prev &&
      prev.bold === marks.bold &&
      prev.italic === marks.italic &&
      prev.code === marks.code &&
      prev.href === marks.href
    ) {
      prev.text += t;
    } else {
      out.push({ text: t, ...marks });
    }
  };
  const walk = (node: Node, marks: Marks) => {
    if (node.nodeType === NodeType.TEXT_NODE) {
      push((node as TextNode).text, marks);
      return;
    }
    if (!isElement(node)) return;
    const name = tag(node);
    switch (name) {
      case 'strong':
      case 'b':
        return node.childNodes.forEach((c) => walk(c, { ...marks, bold: true }));
      case 'em':
      case 'i':
        return node.childNodes.forEach((c) => walk(c, { ...marks, italic: true }));
      case 'code':
        return node.childNodes.forEach((c) => walk(c, { ...marks, code: true }));
      case 'a': {
        const href = node.getAttribute('href');
        if (!href) throw new Error(`${where}: <a> without href`);
        return node.childNodes.forEach((c) => walk(c, { ...marks, href }));
      }
      case 'br':
        return push(' ', marks);
      case 'input':
        return; // checkbox of a task-list item, handled by the caller
      case 'p':
      case 'span':
        return node.childNodes.forEach((c) => walk(c, marks));
      default:
        throw new Error(`${where}: unsupported inline <${name}>`);
    }
  };
  el.childNodes.forEach((c) => walk(c, {}));
  // Trim the outer whitespace of the run.
  if (out.length) {
    out[0]!.text = out[0]!.text.replace(/^\s+/, '');
    out[out.length - 1]!.text = out[out.length - 1]!.text.replace(/\s+$/, '');
  }
  // Clean undefined marks (spread of {} keeps none, but be explicit for stable JSON).
  return out
    .filter((n) => n.text.length > 0)
    .map((n) => {
      const clean: Inline = { text: n.text };
      if (n.bold) clean.bold = true;
      if (n.italic) clean.italic = true;
      if (n.code) clean.code = true;
      if (n.href) clean.href = n.href;
      return clean;
    });
}

function listItem(li: HTMLElement, where: string): ListItem {
  if (li.childNodes.some((c) => isElement(c) && ['ul', 'ol'].includes(tag(c))))
    throw new Error(`${where}: nested lists are not supported`);
  const box = li.childNodes.find((c): c is HTMLElement => isElement(c) && tag(c) === 'input');
  const item: ListItem = { content: inlines(li, where) };
  if (box) {
    if (box.getAttribute('type') !== 'checkbox') throw new Error(`${where}: unexpected <input>`);
    item.task = true;
    if (box.hasAttribute('checked')) item.checked = true;
  }
  return item;
}

function cells(row: HTMLElement, where: string): Inline[][] {
  return row.childNodes
    .filter((c): c is HTMLElement => isElement(c) && ['th', 'td'].includes(tag(c)))
    .map((c) => inlines(c, where));
}

function table(el: HTMLElement, where: string): Block {
  const rows = el.querySelectorAll('tr');
  const headRows = el.querySelectorAll('thead tr');
  const head = headRows.length ? cells(headRows[0]!, where) : [];
  const body = rows.filter((r) => !headRows.includes(r)).map((r) => cells(r, where));
  return { type: 'table', head, rows: body };
}

export function htmlToBlocks(html: string, where = 'html'): Block[] {
  const root = parse(html, { comment: false });
  return nodesToBlocks(root.childNodes, where);
}

function nodesToBlocks(nodes: Node[], where: string): Block[] {
  const out: Block[] = [];
  for (const node of nodes) {
    if (node.nodeType === NodeType.TEXT_NODE) {
      if ((node as TextNode).text.trim())
        throw new Error(`${where}: stray text outside a block: "${(node as TextNode).text.trim().slice(0, 40)}"`);
      continue;
    }
    if (!isElement(node)) continue;
    const name = tag(node);
    switch (name) {
      case 'p':
        out.push({ type: 'p', content: inlines(node, where) });
        break;
      case 'h2':
      case 'h3':
      case 'h4':
        out.push({ type: name, content: inlines(node, where) });
        break;
      case 'ul':
      case 'ol':
        out.push({
          type: name,
          items: node.childNodes
            .filter((c): c is HTMLElement => isElement(c) && tag(c) === 'li')
            .map((li) => listItem(li, where)),
        });
        break;
      case 'blockquote':
        out.push({ type: 'quote', blocks: nodesToBlocks(node.childNodes, where) });
        break;
      case 'table':
        out.push(table(node, where));
        break;
      case 'hr':
        break;
      default:
        throw new Error(`${where}: unsupported block <${name}>`);
    }
  }
  return out;
}

function* jsonFiles(dir: string): Generator<string> {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) yield* jsonFiles(p);
    else if (f.endsWith('.json')) yield p;
  }
}

function main(): void {
  const check = process.argv.includes('--check');
  let converted = 0;
  const problems: string[] = [];
  for (const d of DIRS) {
    for (const file of jsonFiles(join(ROOT, d))) {
      const rel = relative(ROOT, file);
      const text = readFileSync(file, 'utf8');
      const data = JSON.parse(text) as Record<string, unknown>;
      if (check) {
        if ('html' in data) problems.push(`${rel}: still has an html field`);
        if (/<\/?[a-z][a-z0-9]*[\s>/]/i.test(text)) problems.push(`${rel}: contains an HTML tag`);
        continue;
      }
      if (typeof data.html !== 'string') continue;
      const { html, ...rest } = data;
      const body = htmlToBlocks(html as string, rel);
      writeFileSync(file, `${JSON.stringify({ ...rest, body }, null, 2)}\n`);
      converted++;
    }
  }
  if (check) {
    for (const p of problems) console.error(`error ${p}`);
    console.log(`content: ${problems.length} problem(s)`);
    process.exit(problems.length ? 1 : 0);
  }
  console.log(`converted ${converted} file(s)`);
}

main();
