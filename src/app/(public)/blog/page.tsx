import { Metadata } from "next";
import BlogPageClient from "@/components/public/BlogPageClient";
import { connectDB } from "@/lib/mongodb";
import BlogPost from "@/models/BlogPost";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "وبلاگ",
  description: "آموزش راه‌اندازی بروکر MQTT، اتصال دستگاه‌ها و بهترین شیوه‌های IoT. مقالات تخصصی برای توسعه‌دهندگان و کسب‌وکارها.",
  keywords: ["وبلاگ", "آموزش MQTT", "IoT", "بروکر پیام", "pub sub", "mqttcloud"],
  alternates: { canonical: "https://mqttcloud.ir/blog" },
  openGraph: {
    title: "وبلاگ | mqttcloud.ir",
    description: "آموزش راه‌اندازی بروکر MQTT، اتصال دستگاه‌ها و بهترین شیوه‌های IoT.",
    url: "https://mqttcloud.ir/blog",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "وبلاگ mqttcloud.ir" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "وبلاگ | mqttcloud.ir",
    description: "آموزش راه‌اندازی بروکر MQTT، اتصال دستگاه‌ها و بهترین شیوه‌های IoT.",
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

  return <BlogPageClient posts={posts} />;
}
