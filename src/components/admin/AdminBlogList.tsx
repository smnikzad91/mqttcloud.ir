"use client";

import ContentList, { type ContentRow } from "./ContentList";

// Defined at module scope so ContentList's load callback stays stable.
function mapPost(p: Record<string, unknown>): ContentRow {
  return {
    id: String(p.id),
    title: String(p.title ?? ""),
    category: String(p.category ?? ""),
    published: !!p.published,
    highlight: !!p.highlight,
    cover: (p.coverImage as string) || undefined,
    date: String(p.createdAt ?? ""),
    meta: (p.readTime as string) || undefined,
    publicHref: `/blog/${p.slug}`,
  };
}

export default function AdminBlogList() {
  return <ContentList kind="blog" mapRow={mapPost} />;
}
