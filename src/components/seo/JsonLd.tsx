/**
 * Structured data, server-rendered.
 *
 * It has to be in the HTML the crawler receives — data injected later by a
 * client component is not reliably read, which is the whole reason this is a
 * server component with no interactivity of its own.
 */
export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // The payload is built from our own database, but `<` is escaped anyway
      // so a stray character in a description cannot close the tag early.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c'),
      }}
    />
  );
}
