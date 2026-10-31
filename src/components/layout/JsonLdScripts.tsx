import { serializeJsonLd, type JsonLd } from '@/seo/jsonld';

/** One <script type="application/ld+json"> per block; null/undefined blocks are skipped. */
export function JsonLdScripts({ blocks }: { blocks?: (JsonLd | null | undefined)[] }) {
  return (
    <>
      {(blocks ?? [])
        .filter((b): b is JsonLd => !!b)
        .map((b, i) => (
          <script
            key={i}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: serializeJsonLd(b) }}
          />
        ))}
    </>
  );
}
