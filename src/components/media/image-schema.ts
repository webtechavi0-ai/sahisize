/**
 * Zod schemas for the site image pipeline:
 *
 *   src/content/images/manifest.json   hand-edited: one entry per image slot (where it goes,
 *                                      alt text, generation prompt, review status)
 *   src/content/images/generated.json  written by `npm run images:optimize` only: the
 *                                      responsive files and intrinsic size of each published slot
 *
 * Pure module (zod only, no `@/` imports) so the CLI scripts under scripts/images can import it
 * through tsx as well as the app. See docs/design/image-pipeline.md.
 */
import { z } from 'zod';

const nonEmpty = z.string().trim().min(1);

/** kebab-case, also used as the file stem: assets/images/source/<id>.png, public/img/<id>-... */
export const SlotIdSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slot id must be lowercase kebab-case')
  .max(80);

/** English site path ("/", "/tools/compress-image"); Hindi pages reuse the slot via /hi/... */
export const RoutePathSchema = z
  .string()
  .regex(/^\/(?!hi(?:\/|$))(?:[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*)?$/, {
    message: 'route must be an English site path without trailing slash, e.g. /exam/neet-ug',
  });

export const PLACEMENTS = ['hero', 'example-correct', 'example-rejected', 'step', 'og-background'] as const;
export const PlacementSchema = z.enum(PLACEMENTS);
export type Placement = z.infer<typeof PlacementSchema>;

/**
 * planned  - no source image yet (generate will create one)
 * review   - a source PNG exists and is waiting for a human check; not published
 * approved - reviewed; optimize publishes it to public/img and the page shows it
 * retired  - kept for history; never generated, optimized or shown
 */
export const SLOT_STATUSES = ['planned', 'review', 'approved', 'retired'] as const;
export const SlotStatusSchema = z.enum(SLOT_STATUSES);
export type SlotStatus = z.infer<typeof SlotStatusSchema>;

/** Sizes the OpenAI Images API accepts for gpt-image models. */
export const GENERATION_SIZES = ['1024x1024', '1536x1024', '1024x1536'] as const;
export const GenerationSizeSchema = z.enum(GENERATION_SIZES);
export type GenerationSize = z.infer<typeof GenerationSizeSchema>;

export const GenerationSchema = z
  .object({
    /** Slot-specific scene description; the manifest `style` block is added around it. */
    prompt: nonEmpty.min(80, 'prompt is too short to be specific'),
    size: GenerationSizeSchema,
    quality: z.enum(['low', 'medium', 'high']),
    background: z.enum(['opaque', 'transparent']),
  })
  .strict();
export type Generation = z.infer<typeof GenerationSchema>;

/** "3:2" -> ratio. Output is centre-cropped to this aspect. */
export const AspectSchema = z.string().regex(/^[1-9]\d{0,3}:[1-9]\d{0,3}$/, 'aspect must look like 3:2');

export const LocalizedAltSchema = z
  .object({
    en: nonEmpty.max(160),
    hi: nonEmpty.max(160),
  })
  .strict();

/**
 * Exam group id, as in a preset's `group` field ("banking", "state-psc"; see EXAM_GROUPS in
 * src/config/exams.ts). Kept as a kebab-case string so this module stays free of app imports;
 * the manifest test checks every value against EXAM_GROUPS.
 */
export const ExamGroupIdSchema = z.string().regex(/^[a-z]+(?:-[a-z]+)*$/, 'group must be a kebab-case exam group id');

export const SlotSchema = z
  .object({
    id: SlotIdSchema,
    /** Pages that show this slot. May be empty only for a group slot (see `groups`). */
    routes: z.array(RoutePathSchema),
    /**
     * Exam groups this slot illustrates (group slots only). A group slot is NOT bound to any
     * route: pages look it up with `groupImage(group)` / `examPanelImage(...)` in images.ts, so it
     * never shows up in RouteHero / RouteImages and never competes with an exam's own hero.
     */
    groups: z.array(ExamGroupIdSchema).min(1).optional(),
    placement: PlacementSchema,
    aspect: AspectSchema,
    /** Responsive output widths in px, ascending; the last one is the largest rendition. */
    widths: z
      .array(z.number().int().min(160).max(2400))
      .min(2)
      .max(3)
      .refine((w) => w.every((v, i) => i === 0 || v > w[i - 1]!), 'widths must be ascending'),
    /** HTML `sizes` attribute for the <picture> sources. */
    sizes: nonEmpty,
    alt: LocalizedAltSchema,
    generation: GenerationSchema,
    status: SlotStatusSchema,
    /** Free text for reviewers and the integration step (where it goes, what it must not show). */
    notes: z.string().optional(),
  })
  .strict();
export type ImageSlot = z.infer<typeof SlotSchema>;

export const ImageManifestSchema = z
  .object({
    version: z.literal(1),
    /** Shared art direction, wrapped around every slot prompt so the set looks like one site. */
    style: z
      .object({
        base: nonEmpty,
        avoid: nonEmpty,
      })
      .strict(),
    slots: z.array(SlotSchema).min(1),
  })
  .strict()
  .superRefine((m, ctx) => {
    const seen = new Set<string>();
    m.slots.forEach((s, i) => {
      if (seen.has(s.id)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['slots', i, 'id'], message: `duplicate slot id ${s.id}` });
      }
      seen.add(s.id);
      if (new Set(s.routes).size !== s.routes.length) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['slots', i, 'routes'], message: 'duplicate route' });
      }
      if (s.routes.length === 0 && !s.groups) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['slots', i, 'routes'], message: 'a slot needs at least one route or group' });
      }
      if (s.groups && s.placement === 'hero') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['slots', i, 'placement'],
          message: 'a group slot cannot be a hero (each exam page has at most one hero of its own)',
        });
      }
    });
    // One live slot per group, so a group lookup is unambiguous.
    const groupSlots = new Map<string, string>();
    m.slots.forEach((s, i) => {
      if (!s.groups || s.status === 'retired') return;
      if (new Set(s.groups).size !== s.groups.length) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['slots', i, 'groups'], message: 'duplicate group' });
      }
      for (const g of new Set(s.groups)) {
        const other = groupSlots.get(g);
        if (other) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['slots', i, 'groups'], message: `group ${g} already has slot ${other}` });
        }
        groupSlots.set(g, s.id);
      }
    });
    // One hero per route: a page has exactly one LCP image.
    const heroRoutes = new Map<string, string>();
    m.slots.forEach((s, i) => {
      if (s.placement !== 'hero' || s.status === 'retired') return;
      for (const r of s.routes) {
        const other = heroRoutes.get(r);
        if (other) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['slots', i, 'routes'],
            message: `${r} already has hero ${other}`,
          });
        }
        heroRoutes.set(r, s.id);
      }
    });
  });
export type ImageManifest = z.infer<typeof ImageManifestSchema>;

export const ImageFileSchema = z
  .object({
    /** Public URL path, e.g. /img/home-hero-960-1a2b3c4d.avif */
    src: z.string().regex(/^\/img\/[a-z0-9-]+-\d+-[0-9a-f]{8}\.(?:avif|webp)$/),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  })
  .strict();
export type ImageFile = z.infer<typeof ImageFileSchema>;

export const GeneratedImageSchema = z
  .object({
    /** Intrinsic size of the largest rendition (used for width/height attributes: no CLS). */
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    /** First 8 hex chars of sha256(source PNG + optimize settings); also in every file name. */
    hash: z.string().regex(/^[0-9a-f]{8}$/),
    /** Tiny inline WebP for the blur-up placeholder. */
    blurDataURL: z.string().regex(/^data:image\/webp;base64,[A-Za-z0-9+/=]+$/).max(2000),
    avif: z.array(ImageFileSchema).min(1),
    webp: z.array(ImageFileSchema).min(1),
  })
  .strict();
export type GeneratedImage = z.infer<typeof GeneratedImageSchema>;

export const GeneratedImagesSchema = z
  .object({
    version: z.literal(1),
    images: z.record(SlotIdSchema, GeneratedImageSchema),
  })
  .strict();
export type GeneratedImages = z.infer<typeof GeneratedImagesSchema>;

/** "3:2" -> 1.5 */
export function aspectRatio(aspect: string): number {
  const [w, h] = aspect.split(':').map(Number);
  return w! / h!;
}

/** Full prompt sent to the image model: shared style + slot scene + shared constraints. */
export function composePrompt(style: ImageManifest['style'], slot: Pick<ImageSlot, 'generation'>): string {
  return [style.base, slot.generation.prompt, style.avoid].map((s) => s.trim()).join('\n\n');
}
