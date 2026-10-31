/**
 * Zod schema for structured rich text (src/lib/blocks.ts). Pure (no server-only), so the
 * content scripts and tests can import it.
 */
import { z } from 'zod';
import type { Block, Inline, ListItem } from '@/lib/blocks';

const hrefSchema = z
  .string()
  .refine(
    (h) => /^\/(?!\/)[^\s]*$/.test(h) || /^https:\/\/[^\s]+$/.test(h) || /^mailto:[^\s]+$/.test(h) || /^#[\w-]+$/.test(h),
    'href must be a site path ("/x"), https URL, mailto: or #anchor',
  );

export const InlineSchema: z.ZodType<Inline> = z
  .object({
    text: z.string().min(1),
    bold: z.literal(true).optional(),
    italic: z.literal(true).optional(),
    code: z.literal(true).optional(),
    href: hrefSchema.optional(),
  })
  .strict();

const inlines = z.array(InlineSchema).min(1);

export const ListItemSchema: z.ZodType<ListItem> = z
  .object({
    content: inlines,
    task: z.literal(true).optional(),
    checked: z.literal(true).optional(),
  })
  .strict();

export const BlockSchema: z.ZodType<Block> = z.lazy(() =>
  z.discriminatedUnion('type', [
    z.object({ type: z.literal('p'), content: inlines }).strict(),
    z.object({ type: z.literal('h2'), content: inlines }).strict(),
    z.object({ type: z.literal('h3'), content: inlines }).strict(),
    z.object({ type: z.literal('h4'), content: inlines }).strict(),
    z.object({ type: z.literal('ul'), items: z.array(ListItemSchema).min(1) }).strict(),
    z.object({ type: z.literal('ol'), items: z.array(ListItemSchema).min(1) }).strict(),
    z.object({ type: z.literal('quote'), blocks: z.array(BlockSchema).min(1) }).strict(),
    z
      .object({
        type: z.literal('table'),
        head: z.array(z.array(InlineSchema)),
        rows: z.array(z.array(z.array(InlineSchema))).min(1),
      })
      .strict(),
  ]),
);

export const BodySchema = z.array(BlockSchema);
