import { Metadata } from "next";
import { pageMetadata } from "@/lib/pageSeo";
import FaqPageClient from "@/components/public/FaqPageClient";
import { JsonLd } from "@/components/common/JsonLd";
import { connectDB } from "@/lib/mongodb";
import Faq from "@/models/Faq";

export const dynamic = "force-dynamic";

// Title, description and keywords are editable in /admin/seo-settings (src/lib/pageSeo.ts).
export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata("faq");
}

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
