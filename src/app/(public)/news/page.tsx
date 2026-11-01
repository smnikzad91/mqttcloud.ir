import { Metadata } from "next";
import { pageMetadata } from "@/lib/pageSeo";
import NewsPageClient from "@/components/public/NewsPageClient";
import { connectDB } from "@/lib/mongodb";
import NewsItem from "@/models/NewsItem";

export const dynamic = "force-dynamic";

// Title, description and keywords are editable in /admin/seo-settings (src/lib/pageSeo.ts).
// While nothing is published the page is only an empty state: noindex it (as the sitemap
// already leaves it out) so Google doesn't file it as thin content. It flips to indexable
// as soon as the first item is published.
export async function generateMetadata(): Promise<Metadata> {
  const meta = await pageMetadata("news");
  const hasNews = await NewsItem.exists({ published: true }).catch(() => null);
  return hasNews ? meta : { ...meta, robots: { index: false, follow: true } };
}

export default async function NewsPage() {
  await connectDB();
  const raw = await NewsItem.find({ published: true })
    .sort({ publishedAt: -1 })
    .lean();

  const news = raw.map((n) => ({
    id:          String(n._id),
    category:    n.category,
    title:       n.title,
    body:        n.body,
    image:       n.image ?? undefined,
    hashtags:    n.hashtags ?? [],
    highlight:   n.highlight,
    publishedAt: n.publishedAt ? (n.publishedAt as Date).toISOString() : undefined,
  }));

  return <NewsPageClient news={news} />;
}
