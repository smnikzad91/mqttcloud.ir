import { notFound } from "next/navigation";
import { Metadata } from "next";
import BlogPostClient from "@/components/public/BlogPostClient";
import { JsonLd } from "@/components/common/JsonLd";
import { connectDB } from "@/lib/mongodb";
import BlogPost from "@/models/BlogPost";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  await connectDB();
  const post = await BlogPost.findOne({ slug, published: true }).lean();
  if (!post) return {};

  const url = `https://mqttcloud.ir/blog/${slug}`;
  const image = post.coverImage ?? "/opengraph-image";
  const keywords = [post.category, ...(post.hashtags ?? [])].filter(Boolean);
  const publishedTime = post.createdAt ? (post.createdAt as Date).toISOString() : undefined;

  return {
    title: post.title,
    description: post.excerpt,
    keywords,
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url,
      type: "article",
      publishedTime,
      authors: ["mqttcloud.ir"],
      tags: keywords,
      images: [{ url: image, width: 1200, height: 630, alt: post.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: [image],
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  await connectDB();

  const raw = await BlogPost.findOne({ slug, published: true }).lean();
  if (!raw) notFound();

  const post = {
    slug:        raw.slug,
    category:    raw.category,
    title:       raw.title,
    excerpt:     raw.excerpt,
    coverImage:  raw.coverImage ?? undefined,
    createdAt:   raw.createdAt ? (raw.createdAt as Date).toISOString() : undefined,
    readTime:    raw.readTime,
    sections:    raw.sections,
    hashtags:    raw.hashtags ?? [],
    highlight:   raw.highlight ?? false,
  };

  const relatedRaw = await BlogPost.find({ slug: { $ne: slug }, published: true })
    .limit(3)
    .select("slug category title excerpt readTime createdAt coverImage")
    .lean();

  const related = relatedRaw.map((p) => ({
    slug:       p.slug,
    category:   p.category,
    title:      p.title,
    excerpt:    p.excerpt,
    readTime:   p.readTime,
    createdAt:  p.createdAt ? (p.createdAt as Date).toISOString() : undefined,
    coverImage: p.coverImage ?? undefined,
  }));

  const url = `https://mqttcloud.ir/blog/${slug}`;
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    image: post.coverImage ? [post.coverImage] : undefined,
    datePublished: post.createdAt,
    dateModified: post.createdAt,
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
      { "@type": "ListItem", position: 2, name: "وبلاگ", item: "https://mqttcloud.ir/blog" },
      { "@type": "ListItem", position: 3, name: post.title, item: url },
    ],
  };

  return (
    <>
      <JsonLd data={articleJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      <BlogPostClient post={post} related={related} />
    </>
  );
}
