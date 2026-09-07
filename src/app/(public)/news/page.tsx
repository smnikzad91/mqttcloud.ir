import { Metadata } from "next";
import NewsPageClient from "@/components/public/NewsPageClient";
import { connectDB } from "@/lib/mongodb";
import NewsItem from "@/models/NewsItem";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "اخبار",
  description: "آخرین اخبار، به‌روزرسانی‌ها و اطلاعیه‌های mqttcloud.ir. از جدیدترین امکانات بروکر MQTT مطلع شوید.",
  keywords: ["اخبار MQTT", "اخبار mqttcloud", "به‌روزرسانی محصول", "اطلاعیه"],
  alternates: { canonical: "https://mqttcloud.ir/news" },
  openGraph: {
    title: "اخبار | mqttcloud.ir",
    description: "آخرین اخبار و اطلاعیه‌های mqttcloud.ir.",
    url: "https://mqttcloud.ir/news",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "اخبار mqttcloud.ir" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "اخبار | mqttcloud.ir",
    description: "آخرین اخبار و اطلاعیه‌های mqttcloud.ir.",
    images: ["/opengraph-image"],
  },
};

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
