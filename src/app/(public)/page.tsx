import { Metadata } from "next";
import { pageMetadata } from "@/lib/pageSeo";
import HomePageClient from "@/components/public/HomePageClient";
import { JsonLd } from "@/components/common/JsonLd";
import { connectDB } from "@/lib/mongodb";
import BlogPost from "@/models/BlogPost";
import NewsItem from "@/models/NewsItem";
import Faq from "@/models/Faq";

export const dynamic = "force-dynamic";

// Title, description and keywords are editable in /admin/seo-settings (src/lib/pageSeo.ts).
export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata("home");
}

export default async function HomePage() {
  await connectDB();

  const [rawBlog, rawNews, rawFaqs] = await Promise.all([
    BlogPost.findOne({ highlight: true, published: true }).select("slug category title excerpt coverImage readTime").lean(),
    NewsItem.findOne({ highlight: true, published: true }).select("_id slug category title body image publishedAt").lean(),
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
        slug:        rawNews.slug ?? "",
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

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "mqttcloud.ir",
    alternateName: "بروکر MQTT ابری mqttcloud",
    url: "https://mqttcloud.ir",
    inLanguage: "fa-IR",
  };

  return (
    <>
      <JsonLd data={websiteJsonLd} />
      {faqJsonLd && <JsonLd data={faqJsonLd} />}
      <HomePageClient featuredBlog={featuredBlog} featuredNews={featuredNews} faqs={faqs} />
    </>
  );
}
