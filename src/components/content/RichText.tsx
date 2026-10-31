/**
 * Renders structured content (`Block[]`, src/lib/blocks.ts) as semantic HTML elements.
 * Server component; no dangerouslySetInnerHTML. Internal links use next/link and are
 * rendered exactly as given (the content loaders already localized them for the page
 * language); external links open with rel="noopener noreferrer" in a new tab.
 *
 *   <RichText blocks={guide.body} anchors />          // h2 ids for a table of contents
 *   <RichText blocks={copy} headingOffset={1} />      // h2 -> h3 when nested under a page h2
 *   <RichInline content={excerpt} />                  // one paragraph's inline nodes
 */
import Link from 'next/link';
import type { ReactNode } from 'react';
import { h2Ids, type Block, type Inline } from '@/lib/blocks';

type HeadingTag = 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

export interface RichTextProps {
  blocks: readonly Block[];
  /** Give h2 headings stable ids (same ids as `tableOfContents(blocks)`). */
  anchors?: boolean;
  /** Shift heading levels down (1: h2 -> h3), to keep one H1 and a valid outline. */
  headingOffset?: 0 | 1 | 2;
  className?: string;
}

function isExternal(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

function Anchor({ href, children }: { href: string; children: ReactNode }) {
  if (isExternal(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  }
  if (href.startsWith('mailto:') || href.startsWith('#')) return <a href={href}>{children}</a>;
  return (
    <Link href={href} prefetch={false}>
      {children}
    </Link>
  );
}

function renderInline(n: Inline, key: number): ReactNode {
  let node: ReactNode = n.text;
  if (n.code) node = <code>{node}</code>;
  if (n.italic) node = <em>{node}</em>;
  if (n.bold) node = <strong>{node}</strong>;
  if (n.href) node = <Anchor href={n.href}>{node}</Anchor>;
  return <span key={key}>{node}</span>;
}

/** Inline nodes only (no wrapping element). */
export function RichInline({ content }: { content: readonly Inline[] }) {
  return <>{content.map((n, i) => (n.bold || n.italic || n.code || n.href ? renderInline(n, i) : n.text))}</>;
}

function shiftHeading(type: 'h2' | 'h3' | 'h4', offset: number): HeadingTag {
  const level = Math.min(6, Number(type[1]) + offset);
  return `h${level}` as HeadingTag;
}

function Table({ head, rows }: Extract<Block, { type: 'table' }>) {
  return (
    <div className="overflow-x-auto">
      <table>
        {head.length > 0 && (
          <thead>
            <tr>
              {head.map((c, i) => (
                <th key={i} scope="col">
                  <RichInline content={c} />
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j}>
                  <RichInline content={c} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderBlocks(blocks: readonly Block[], ids: readonly (string | undefined)[] | null, offset: number): ReactNode[] {
  return blocks.map((b, i) => {
    switch (b.type) {
      case 'p':
        return (
          <p key={i}>
            <RichInline content={b.content} />
          </p>
        );
      case 'h2':
      case 'h3':
      case 'h4': {
        const Tag = shiftHeading(b.type, offset);
        return (
          <Tag key={i} id={ids?.[i]}>
            <RichInline content={b.content} />
          </Tag>
        );
      }
      case 'ul':
      case 'ol': {
        const List = b.type;
        const tasks = b.items.some((it) => it.task);
        return (
          <List key={i} className={tasks ? 'list-none pl-0' : undefined}>
            {b.items.map((it, j) => (
              <li key={j}>
                {it.task && (
                  <span aria-hidden="true" className="mr-2 inline-block">
                    {it.checked ? '\u2611' : '\u2610'}
                  </span>
                )}
                <RichInline content={it.content} />
              </li>
            ))}
          </List>
        );
      }
      case 'quote':
        return <blockquote key={i}>{renderBlocks(b.blocks, null, offset)}</blockquote>;
      case 'table':
        return <Table key={i} {...b} />;
    }
  });
}

export function RichText({ blocks, anchors = false, headingOffset = 0, className }: RichTextProps) {
  const ids = anchors ? h2Ids(blocks) : null;
  const children = renderBlocks(blocks, ids, headingOffset);
  return className ? <div className={className}>{children}</div> : <>{children}</>;
}

export default RichText;
