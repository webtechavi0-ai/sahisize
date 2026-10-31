/**
 * Structured rich-text content (guides, exam copy, hub copy). Content JSON never stores
 * HTML: every body is a `Block[]` rendered by `<RichText>` (src/components/content).
 *
 * Pure types and helpers, safe on server and client. The zod schema that validates these
 * shapes lives in src/server/content/schemas/blocks.ts.
 */

/** A run of text with optional marks. Marks are only present when true. */
export interface Inline {
  text: string;
  bold?: true;
  italic?: true;
  code?: true;
  /** Site path ("/exam/ibps-po", English, localized at render time) or absolute https URL. */
  href?: string;
}

export interface ListItem {
  content: Inline[];
  /** Checklist item (rendered with a non-interactive checkbox). */
  task?: true;
  /** Only with `task`: pre-ticked. */
  checked?: true;
}

export type HeadingLevel = 'h2' | 'h3' | 'h4';

export type Block =
  | { type: 'p'; content: Inline[] }
  | { type: HeadingLevel; content: Inline[] }
  | { type: 'ul' | 'ol'; items: ListItem[] }
  | { type: 'quote'; blocks: Block[] }
  | { type: 'table'; head: Inline[][]; rows: Inline[][][] };

export type BlockType = Block['type'];

/** Plain text of inline nodes. */
export function inlineText(content: readonly Inline[]): string {
  return content.map((n) => n.text).join('');
}

/** Plain text of one block (tables: cells joined with " · ", rows with newlines). */
export function blockText(block: Block): string {
  switch (block.type) {
    case 'p':
    case 'h2':
    case 'h3':
    case 'h4':
      return inlineText(block.content);
    case 'ul':
    case 'ol':
      return block.items.map((i) => inlineText(i.content)).join('\n');
    case 'quote':
      return blocksToText(block.blocks);
    case 'table':
      return [block.head, ...block.rows].map((r) => r.map(inlineText).join(' · ')).join('\n');
  }
}

/** Plain text of a body, blocks separated by blank lines (search index, excerpts, OG text). */
export function blocksToText(blocks: readonly Block[]): string {
  return blocks.map(blockText).join('\n\n');
}

export function isHeading(b: Block): b is Extract<Block, { type: HeadingLevel }> {
  return b.type === 'h2' || b.type === 'h3' || b.type === 'h4';
}

/** URL-safe anchor id from heading text (Latin and Devanagari letters kept). */
export function headingId(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFC')
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/**
 * Anchor ids of top-level h2 blocks, aligned by index (undefined for other blocks).
 * Duplicates get "-2", "-3"… in order. RichText `anchors` and tableOfContents use this.
 */
export function h2Ids(blocks: readonly Block[]): (string | undefined)[] {
  const seen = new Map<string, number>();
  return blocks.map((b) => {
    if (b.type !== 'h2') return undefined;
    const base = headingId(inlineText(b.content)) || 'section';
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    return n ? `${base}-${n + 1}` : base;
  });
}

/** h2 headings of a body, for a table of contents (ids match RichText `anchors`). */
export function tableOfContents(blocks: readonly Block[]): { id: string; text: string }[] {
  const ids = h2Ids(blocks);
  return blocks.flatMap((b, i) => (b.type === 'h2' ? [{ id: ids[i]!, text: inlineText(b.content) }] : []));
}

/**
 * Split a body into sections at each h2: `{ heading: null, blocks }` for content before
 * the first h2, then one entry per h2. Exam pages place their own components between them.
 */
export function splitByH2(
  blocks: readonly Block[],
): { heading: Inline[] | null; blocks: Block[] }[] {
  const out: { heading: Inline[] | null; blocks: Block[] }[] = [{ heading: null, blocks: [] }];
  for (const b of blocks) {
    if (b.type === 'h2') out.push({ heading: b.content, blocks: [] });
    else out[out.length - 1]!.blocks.push(b);
  }
  return out[0]!.blocks.length ? out : out.slice(1);
}
