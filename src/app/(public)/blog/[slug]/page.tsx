import { notFound } from "next/navigation";
import { Metadata } from "next";
import BlogPostClient from "@/components/public/BlogPostClient";
import { JsonLd } from "@/components/common/JsonLd";
import { connectDB } from "@/lib/mongodb";
import BlogPost from "@/models/BlogPost";

export const dynamic = "force-dynamic";

const SITE = "https://mqttcloud.ir";
const absolute = (url: string) => (url.startsWith("http") ? url : `${SITE}${url}`);
// Google shows ~60 characters of a title, so don't spend them on the brand twice.
const pageTitle = (title: string) => (/mqttcloud/i.test(title) ? { absolute: title } : title);

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  await connectDB();
  const post = await BlogPost.findOne({ slug, published: true }).lean();
  if (!post) return {};

  const url = `${SITE}/blog/${slug}`;
  // Covers made for the launch posts are 1600x840; an uploaded cover's size is unknown, so leave it out.
  const ogImage = post.coverImage
    ? { url: absolute(post.coverImage), alt: post.title }
    : { url: "/opengraph-image", width: 1200, height: 630, alt: post.title };
  // Admin SEO overrides (blog editor → SEO) win; otherwise the post's own title, excerpt and tags.
  const seoTitle = post.seoTitle?.trim() || post.title;
  const description = post.seoDescription?.trim() || post.excerpt;
  const keywords = post.seoKeywords?.length ? post.seoKeywords : [post.category, ...(post.hashtags ?? [])].filter(Boolean);
  const publishedTime = post.createdAt ? (post.createdAt as Date).toISOString() : undefined;

  return {
    title: pageTitle(seoTitle),
    description,
    keywords,
    alternates: { canonical: url },
    openGraph: {
      title: seoTitle,
      description,
      url,
      type: "article",
      publishedTime,
      modifiedTime: post.updatedAt ? (post.updatedAt as Date).toISOString() : publishedTime,
      authors: ["mqttcloud.ir"],
      tags: keywords,
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title: seoTitle,
      description,
      images: [ogImage.url],
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
    updatedAt:   raw.updatedAt ? (raw.updatedAt as Date).toISOString() : undefined,
    readTime:    raw.readTime,
    sections:    raw.sections,
    hashtags:    raw.hashtags ?? [],
    highlight:   raw.highlight ?? false,
  };

  // Related: same category first, newest first, topped up with the newest other posts.
  const relatedFields = "slug category title excerpt readTime createdAt coverImage";
  const sameCategory = await BlogPost.find({ slug: { $ne: slug }, published: true, category: raw.category })
    .sort({ createdAt: -1 }).limit(3).select(relatedFields).lean();
  const others = sameCategory.length < 3
    ? await BlogPost.find({ slug: { $nin: [slug, ...sameCategory.map((p) => p.slug)] }, published: true })
        .sort({ createdAt: -1 }).limit(3 - sameCategory.length).select(relatedFields).lean()
    : [];
  const relatedRaw = [...sameCategory, ...others];

  const related = relatedRaw.map((p) => ({
    slug:       p.slug,
    category:   p.category,
    title:      p.title,
    excerpt:    p.excerpt,
    readTime:   p.readTime,
    createdAt:  p.createdAt ? (p.createdAt as Date).toISOString() : undefined,
    coverImage: p.coverImage ?? undefined,
  }));

  const url = `${SITE}/blog/${slug}`;
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    image: post.coverImage ? [absolute(post.coverImage)] : undefined,
    datePublished: post.createdAt,
    dateModified: post.updatedAt ?? post.createdAt,
    inLanguage: "fa-IR",
    keywords: post.hashtags.join(", ") || undefined,
    author: { "@type": "Organization", name: "mqttcloud.ir", url: "https://mqttcloud.ir" },
    publisher: {
      "@type": "Organization",
      name: "mqttcloud.ir",
      logo: { "@type": "ImageObject", url: `${SITE}/images/email/logo-mark.png`, width: 120, height: 120 },
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
