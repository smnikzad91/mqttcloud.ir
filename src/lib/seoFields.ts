// Length limits for admin-entered search metadata, shared by the page SEO
// settings (/api/admin/seo) and the blog post SEO overrides (/api/admin/blog).

export const SEO_TITLE_MAX = 120;
export const SEO_DESCRIPTION_MAX = 320;
export const SEO_KEYWORDS_MAX = 30;
export const SEO_KEYWORD_MAX = 60;

/** Trim, drop empties and duplicates. */
export function cleanKeywords(value: unknown): string[] {
  return Array.isArray(value) ? [...new Set(value.map((k) => String(k).trim()).filter(Boolean))] : [];
}

/** An error message when the values are out of bounds, else null. Empty title/description are allowed (optional overrides). */
export function seoFieldsError(title: string, description: string, keywords: string[]): string | null {
  if (title.length > SEO_TITLE_MAX) return `SEO title is too long (max ${SEO_TITLE_MAX} characters).`;
  if (description.length > SEO_DESCRIPTION_MAX) return `Meta description is too long (max ${SEO_DESCRIPTION_MAX} characters).`;
  if (keywords.length > SEO_KEYWORDS_MAX || keywords.some((k) => k.length > SEO_KEYWORD_MAX))
    return `At most ${SEO_KEYWORDS_MAX} keywords, each up to ${SEO_KEYWORD_MAX} characters.`;
  return null;
}

/**
 * Pull optional blog SEO overrides out of a request body. Returns only the keys
 * that were sent (so a partial update leaves the others alone), or an error.
 */
export function parseBlogSeo(body: Record<string, unknown>): { values: Record<string, unknown> } | { error: string } {
  const values: Record<string, unknown> = {};
  if ("seoTitle" in body) values.seoTitle = String(body.seoTitle ?? "").trim();
  if ("seoDescription" in body) values.seoDescription = String(body.seoDescription ?? "").trim();
  if ("seoKeywords" in body) values.seoKeywords = cleanKeywords(body.seoKeywords);
  const error = seoFieldsError(
    (values.seoTitle as string) ?? "",
    (values.seoDescription as string) ?? "",
    (values.seoKeywords as string[]) ?? [],
  );
  return error ? { error } : { values };
}
