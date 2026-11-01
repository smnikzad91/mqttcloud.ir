import { Metadata } from "next";
import FaqPageClient from "@/components/public/FaqPageClient";
import { JsonLd } from "@/components/common/JsonLd";
import { connectDB } from "@/lib/mongodb";
import Faq from "@/models/Faq";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "سوالات متداول درباره بروکر MQTT",
  description: "پاسخ سوال‌های رایج درباره mqttcloud.ir: آدرس و پورت اتصال، MQTT 3.1.1، شناسه دستگاه (Client ID)، تاپیک‌ها، محدودیت پلن‌ها، پرداخت و تمدید.",
  keywords: ["سوالات MQTT", "پورت MQTT", "Client ID", "تاپیک MQTT", "بروکر MQTT", "mqttcloud"],
  alternates: { canonical: "https://mqttcloud.ir/faq" },
  openGraph: {
    title: "سوالات متداول درباره بروکر MQTT | mqttcloud.ir",
    description: "آدرس و پورت اتصال، شناسه دستگاه، تاپیک‌ها، پلن‌ها، پرداخت و تمدید.",
    url: "https://mqttcloud.ir/faq",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "سوالات متداول درباره بروکر MQTT" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "سوالات متداول درباره بروکر MQTT | mqttcloud.ir",
    description: "آدرس و پورت اتصال، شناسه دستگاه، تاپیک‌ها، پلن‌ها، پرداخت و تمدید.",
    images: ["/opengraph-image"],
  },
};

export default async function FaqPage() {
  await connectDB();
  const rawFaqs = await Faq.find({ active: true }).sort({ order: 1, createdAt: -1 }).select("question answer").lean();

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
      <FaqPageClient faqs={rawFaqs.map((f) => ({ id: String(f._id), question: f.question, answer: f.answer }))} />
    </>
  );
}
