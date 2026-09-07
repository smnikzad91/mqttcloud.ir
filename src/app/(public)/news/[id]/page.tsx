import { notFound } from "next/navigation";
import { Metadata } from "next";
import NewsPostClient from "@/components/public/NewsPostClient";
import { JsonLd } from "@/components/common/JsonLd";
import { connectDB } from "@/lib/mongodb";
import NewsItem from "@/models/NewsItem";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

function stripMarkdown(text: string) {
  return text.replace(/[#*_`~>[\]]/g, "").replace(/\n+/g, " ").trim().slice(0, 160);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  await connectDB();
  const item = await NewsItem.findOne({ _id: id, published: true }).lean().catch(() => null);
  if (!item) return {};

  const url = `https://mqttcloud.ir/news/${id}`;
  const description = stripMarkdown(item.body);
  const image = item.coverImage ?? item.image ?? "/opengraph-image";
  const keywords = [item.category, ...(item.hashtags ?? [])].filter(Boolean);
  const publishedTime = item.publishedAt ? (item.publishedAt as Date).toISOString() : undefined;

  return {
    title: item.title,
    description,
    keywords,
    alternates: { canonical: url },
    openGraph: {
      title: item.title,
      description,
      url,
      type: "article",
      publishedTime,
      authors: ["mqttcloud.ir"],
      tags: keywords,
      images: [{ url: image, width: 1200, height: 630, alt: item.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: item.title,
      description,
      images: [image],
    },
  };
}

export default async function NewsDetailPage({ params }: Props) {
  const { id } = await params;
  await connectDB();

  const raw = await NewsItem.findOne({ _id: id, published: true }).lean().catch(() => null);
  if (!raw) notFound();

  const item = {
    id:          String(raw._id),
    category:    raw.category,
    hashtags:    raw.hashtags ?? [],
    title:       raw.title,
    body:        raw.body,
    image:       raw.image ?? undefined,
    coverImage:  raw.coverImage ?? undefined,
    highlight:   raw.highlight,
    publishedAt: raw.publishedAt ? (raw.publishedAt as Date).toISOString() : undefined,
  };

  const relatedRaw = await NewsItem.find({
    _id: { $ne: raw._id },
    published: true,
  })
    .sort({ publishedAt: -1 })
    .limit(4)
    .select("_id category title image highlight publishedAt")
    .lean();

  const related = relatedRaw.map((n) => ({
    id:          String(n._id),
    category:    n.category,
    title:       n.title,
    image:       n.image ?? undefined,
    highlight:   n.highlight,
    publishedAt: n.publishedAt ? (n.publishedAt as Date).toISOString() : undefined,
  }));

  const url = `https://mqttcloud.ir/news/${item.id}`;
  const image = item.coverImage ?? item.image;
  const newsArticleJsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: item.title,
    description: stripMarkdown(item.body),
    image: image ? [image] : undefined,
    datePublished: item.publishedAt,
    dateModified: item.publishedAt,
    author: { "@type": "Organization", name: "mqttcloud.ir", url: "https://mqttcloud.ir" },
    publisher: {
      "@type": "Organization",
      name: "mqttcloud.ir",
      logo: { "@type": "ImageObject", url: "https://mqttcloud.ir/images/logo/logo-icon.svg" },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "خانه", item: "https://mqttcloud.ir" },
      { "@type": "ListItem", position: 2, name: "اخبار", item: "https://mqttcloud.ir/news" },
      { "@type": "ListItem", position: 3, name: item.title, item: url },
    ],
  };

  return (
    <>
      <JsonLd data={newsArticleJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      <NewsPostClient item={item} related={related} />
    </>
  );
}
