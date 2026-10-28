"use client";

import ContentList, { type ContentRow } from "./ContentList";

// Defined at module scope so ContentList's load callback stays stable.
function mapNews(n: Record<string, unknown>): ContentRow {
  return {
    id: String(n.id),
    title: String(n.title ?? ""),
    category: String(n.category ?? ""),
    published: !!n.published,
    highlight: !!n.highlight,
    cover: (n.coverImage as string) || (n.image as string) || undefined,
    date: String(n.publishedAt ?? ""),
    publicHref: `/news/${n.id}`,
  };
}

export default function AdminNewsList() {
  return <ContentList kind="news" mapRow={mapNews} />;
}
