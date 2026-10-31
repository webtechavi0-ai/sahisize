/**
 * `<script type="application/ld+json">` for schema.org data. The only place (besides the
 * theme/analytics bootstrap) allowed to use dangerouslySetInnerHTML: the payload is
 * serialized by `serializeJsonLd`, which escapes <, >, & and line separators so content can
 * never close the script element. JSON-LD is a non-executed data block (CSP-safe).
 *
 *   <JsonLd data={[breadcrumbList(crumbs), faqPage(faq)]} />   // nulls are dropped
 */
import { compactJsonLd, serializeJsonLd, type JsonLdObject } from '@/seo/jsonld';

type Item = JsonLdObject | null | undefined | false;

export function JsonLd({ data, id }: { data: Item | readonly Item[]; id?: string }) {
  const items = compactJsonLd(Array.isArray(data) ? data : [data as Item]);
  if (!items.length) return null;
  const payload = items.length === 1 ? items[0]! : items;
  return (
    <script
      type="application/ld+json"
      id={id}
      // eslint-disable-next-line react/no-danger -- serialized and escaped JSON-LD only
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(payload) }}
    />
  );
}

export default JsonLd;
