import { Metadata } from "next";
import BlogPageClient from "@/components/public/BlogPageClient";
import { JsonLd } from "@/components/common/JsonLd";
import { connectDB } from "@/lib/mongodb";
import BlogPost from "@/models/BlogPost";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "آموزش MQTT و اینترنت اشیا",
  description: "آموزش MQTT به فارسی: اتصال ESP32 و آردوینو به بروکر، نمونه کد پایتون و Node.js، تاپیک‌ها و QoS و عیب‌یابی اتصال. راهنمای عملی برای پروژه‌های IoT.",
  keywords: ["آموزش MQTT", "آموزش اینترنت اشیا", "ESP32 MQTT", "آردوینو MQTT", "پایتون MQTT", "Node.js MQTT", "QoS MQTT", "mqttcloud"],
  alternates: { canonical: "https://mqttcloud.ir/blog" },
  openGraph: {
    title: "آموزش MQTT و اینترنت اشیا | mqttcloud.ir",
    description: "اتصال ESP32 و آردوینو، نمونه کد پایتون و Node.js، تاپیک‌ها، QoS و عیب‌یابی.",
    url: "https://mqttcloud.ir/blog",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "آموزش MQTT و اینترنت اشیا" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "آموزش MQTT و اینترنت اشیا | mqttcloud.ir",
    description: "اتصال ESP32 و آردوینو، نمونه کد پایتون و Node.js، تاپیک‌ها، QoS و عیب‌یابی.",
    images: ["/opengraph-image"],
  },
};

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
