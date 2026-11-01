import { Metadata } from "next";
import { pageMetadata } from "@/lib/pageSeo";
import NewsPageClient from "@/components/public/NewsPageClient";
import { connectDB } from "@/lib/mongodb";
import NewsItem from "@/models/NewsItem";

export const dynamic = "force-dynamic";

// Title, description and keywords are editable in /admin/seo-settings (src/lib/pageSeo.ts).
export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata("news");
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
