import { Metadata } from "next";
import HomePageClient from "@/components/public/HomePageClient";
import { JsonLd } from "@/components/common/JsonLd";
import { connectDB } from "@/lib/mongodb";
import BlogPost from "@/models/BlogPost";
import NewsItem from "@/models/NewsItem";
import Faq from "@/models/Faq";
import SiteSeo from "@/models/SiteSeo";

export const dynamic = "force-dynamic";

const defaultSeo = {
  title: "mqttcloud.ir — بروکر MQTT ابری برای دستگاه‌های شما",
  description: "mqttcloud.ir یک بروکر MQTT امن و مقیاس‌پذیر است. اکانت و دستگاه بسازید، با TLS متصل شوید و پیام‌ها را بی‌درنگ بین دستگاه‌های خود منتشر و دریافت کنید.",
  keywords: ["بروکر MQTT", "MQTT ابری", "IoT", "اتصال دستگاه", "پیام‌رسانی بی‌درنگ", "pub sub", "MQTT broker", "mqttcloud"],
};

export async function generateMetadata(): Promise<Metadata> {
  await connectDB();
  const seo = await SiteSeo.findOne().lean();

  const title = seo?.title || defaultSeo.title;
  const description = seo?.description || defaultSeo.description;
  const keywords = seo?.keywords?.length ? seo.keywords : defaultSeo.keywords;

  return {
    title: { absolute: title },
    description,
    keywords,
    alternates: { canonical: "https://mqttcloud.ir" },
    openGraph: {
      title,
      description,
      url: "https://mqttcloud.ir",
      type: "website",
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "mqttcloud.ir" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/opengraph-image"],
    },
  };
}

export default async function HomePage() {
  await connectDB();

  const [rawBlog, rawNews, rawFaqs] = await Promise.all([
    BlogPost.findOne({ highlight: true, published: true }).select("slug category title excerpt coverImage readTime").lean(),
    NewsItem.findOne({ highlight: true, published: true }).select("_id category title body image publishedAt").lean(),
    Faq.find({ active: true }).sort({ order: 1, createdAt: -1 }).select("question answer").lean(),
  ]);

  const featuredBlog = rawBlog
    ? {
        slug:      rawBlog.slug,
        category:  rawBlog.category,
        title:     rawBlog.title,
        excerpt:   rawBlog.excerpt,
        coverImage: rawBlog.coverImage ?? undefined,
        readTime:  rawBlog.readTime,
      }
    : null;

  const featuredNews = rawNews
    ? {
        id:          String(rawNews._id),
        category:    rawNews.category,
        title:       rawNews.title,
        body:        rawNews.body,
        image:       rawNews.image ?? undefined,
        publishedAt: rawNews.publishedAt ? (rawNews.publishedAt as Date).toISOString() : undefined,
      }
    : null;

  const faqs = rawFaqs.map((f) => ({ _id: String(f._id), question: f.question, answer: f.answer }));

  const faqJsonLd = rawFaqs.length > 0
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: rawFaqs.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: { "@type": "Answer", text: f.answer },
        })),
      }
    : null;

  return (
    <>
      {faqJsonLd && <JsonLd data={faqJsonLd} />}
      <HomePageClient featuredBlog={featuredBlog} featuredNews={featuredNews} faqs={faqs} />
    </>
  );
}
