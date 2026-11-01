// News URLs are /news/<slug>: lowercase latin letters, digits and single hyphens.
export const NEWS_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const NEWS_SLUG_MAX = 80;

export function newsSlugError(slug: string): string | null {
  if (!slug) return "Slug is required.";
  if (slug.length > NEWS_SLUG_MAX || !NEWS_SLUG_RE.test(slug))
    return `Slug must be lowercase latin letters, digits and hyphens (max ${NEWS_SLUG_MAX}).`;
  return null;
}

/** Public path for a news item; falls back to its id for an item saved before slugs existed. */
export const newsHref = (n: { slug?: string | null; id?: string; _id?: unknown }) =>
  `/news/${n.slug || String(n.id ?? n._id)}`;
