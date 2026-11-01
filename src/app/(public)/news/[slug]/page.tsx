import { isValidObjectId } from "mongoose";
import { notFound, permanentRedirect } from "next/navigation";
import { Metadata } from "next";
import NewsPostClient from "@/components/public/NewsPostClient";
import { JsonLd } from "@/components/common/JsonLd";
import { connectDB } from "@/lib/mongodb";
import NewsItem from "@/models/NewsItem";
import { newsHref } from "@/lib/newsSlug";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

/**
 * A published item by its slug. Older links used the database id (/news/<id>):
 * those still resolve, and the page redirects them to the slug URL.
 */
async function findNews(param: string) {
  const bySlug = await NewsItem.findOne({ slug: param.toLowerCase(), published: true }).lean().catch(() => null);
  if (bySlug) return bySlug;
  return isValidObjectId(param) ? NewsItem.findOne({ _id: param, published: true }).lean().catch(() => null) : null;
}

const SITE = "https://mqttcloud.ir";
const absolute = (url: string) => (url.startsWith("http") ? url : `${SITE}${url}`);

/** Plain-text summary for meta/OG: markdown stripped, cut at a word boundary to fit Google's ~155 characters. */
function stripMarkdown(text: string, max = 155) {
  const plain = text.replace(/[#*_`~>[\]]/g, "").replace(/\s+/g, " ").trim();
  if (plain.length <= max) return plain;
  const cut = plain.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 20)).trimEnd()}…`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  await connectDB();
  const item = await findNews(slug);
  if (!item) return {};

  const url = `${SITE}${newsHref(item)}`;
  const description = stripMarkdown(item.body);
  // An uploaded image's real size is unknown, so only the default card declares dimensions.
  const ogImage = item.coverImage ?? item.image
    ? { url: absolute((item.coverImage ?? item.image) as string), alt: item.title }
    : { url: "/opengraph-image", width: 1200, height: 630, alt: item.title };
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
      modifiedTime: item.updatedAt ? (item.updatedAt as Date).toISOString() : publishedTime,
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title: item.title,
      description,
      images: [ogImage.url],
    },
  };
}

export default async function NewsDetailPage({ params }: Props) {
  const { slug } = await params;
  await connectDB();

  const raw = await findNews(slug);
  if (!raw) notFound();
  // Old /news/<id> links (and any non-canonical spelling) move permanently to the slug URL.
  if (raw.slug && slug !== raw.slug) permanentRedirect(newsHref(raw));

  const item = {
    id:          String(raw._id),
    slug:        raw.slug ?? "",
    category:    raw.category,
    hashtags:    raw.hashtags ?? [],
    title:       raw.title,
    body:        raw.body,
    image:       raw.image ?? undefined,
    coverImage:  raw.coverImage ?? undefined,
    highlight:   raw.highlight,
    publishedAt: raw.publishedAt ? (raw.publishedAt as Date).toISOString() : undefined,
    updatedAt:   raw.updatedAt ? (raw.updatedAt as Date).toISOString() : undefined,
  };

  const relatedRaw = await NewsItem.find({
    _id: { $ne: raw._id },
    published: true,
  })
    .sort({ publishedAt: -1 })
    .limit(4)
    .select("_id slug category title image highlight publishedAt")
    .lean();

  const related = relatedRaw.map((n) => ({
    id:          String(n._id),
    slug:        n.slug ?? "",
    category:    n.category,
    title:       n.title,
    image:       n.image ?? undefined,
    highlight:   n.highlight,
    publishedAt: n.publishedAt ? (n.publishedAt as Date).toISOString() : undefined,
  }));

  const url = `${SITE}${newsHref(item)}`;
  const image = item.coverImage ?? item.image;
  const newsArticleJsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: item.title,
    description: stripMarkdown(item.body),
    image: image ? [absolute(image)] : undefined,
    datePublished: item.publishedAt,
    dateModified: item.updatedAt ?? item.publishedAt,
    inLanguage: "fa-IR",
    author: { "@type": "Organization", name: "mqttcloud.ir", url: "https://mqttcloud.ir" },
    publisher: {
      "@type": "Organization",
      name: "mqttcloud.ir",
      logo: { "@type": "ImageObject", url: "https://mqttcloud.ir/images/email/logo-mark.png" },
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
