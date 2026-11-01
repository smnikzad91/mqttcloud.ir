import { Metadata } from "next";
import { pageMetadata } from "@/lib/pageSeo";
import BlogPageClient from "@/components/public/BlogPageClient";
import { JsonLd } from "@/components/common/JsonLd";
import { connectDB } from "@/lib/mongodb";
import BlogPost from "@/models/BlogPost";

export const dynamic = "force-dynamic";

// Title, description and keywords are editable in /admin/seo-settings (src/lib/pageSeo.ts).
export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata("blog");
}

export default async function BlogPage() {
  await connectDB();
  const raw = await BlogPost.find({ published: true })
    .sort({ createdAt: -1 })
    .select("slug category title excerpt readTime hashtags createdAt coverImage highlight")
    .lean();

  const posts = raw.map((p) => ({
    slug:        p.slug,
    category:    p.category,
    title:       p.title,
    excerpt:     p.excerpt,
    readTime:    p.readTime,
    hashtags:    p.hashtags ?? [],
    createdAt:   p.createdAt ? (p.createdAt as Date).toISOString() : undefined,
    coverImage:  p.coverImage ?? undefined,
    highlight:   p.highlight ?? false,
  }));

  const absolute = (url: string) => (url.startsWith("http") ? url : `https://mqttcloud.ir${url}`);
  const blogJsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "آموزش MQTT و اینترنت اشیا",
    url: "https://mqttcloud.ir/blog",
    inLanguage: "fa-IR",
    publisher: { "@type": "Organization", name: "mqttcloud.ir", url: "https://mqttcloud.ir" },
    blogPost: posts.map((p) => ({
      "@type": "BlogPosting",
      headline: p.title,
      description: p.excerpt,
      url: `https://mqttcloud.ir/blog/${p.slug}`,
      datePublished: p.createdAt,
      image: p.coverImage ? absolute(p.coverImage) : undefined,
    })),
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "خانه", item: "https://mqttcloud.ir" },
      { "@type": "ListItem", position: 2, name: "وبلاگ", item: "https://mqttcloud.ir/blog" },
    ],
  };

  return (
    <>
      <JsonLd data={blogJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      <BlogPageClient posts={posts} />
    </>
  );
}
