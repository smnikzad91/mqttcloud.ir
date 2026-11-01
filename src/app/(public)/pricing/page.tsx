import { Metadata } from "next";
import PricingPageClient from "@/components/public/PricingPageClient";
import { JsonLd } from "@/components/common/JsonLd";
import { PLAN_DEFS } from "@/lib/plans";
import { connectDB } from "@/lib/mongodb";
import Faq from "@/models/Faq";

export const metadata: Metadata = {
  title: "تعرفه بروکر MQTT؛ پلن رایگان و پرداخت ریالی",
  description: "قیمت سرور MQTT ابری به تومان: پلن رایگان با ۱ اکانت و ۲ دستگاه، پلن پایه ۴۹۹ هزار و استارتر ۹۹۹ هزار تومان برای ۳۰ روز. پرداخت با کارت‌های بانکی ایران، بدون پرداخت ارزی.",
  keywords: ["قیمت بروکر MQTT", "تعرفه سرور MQTT", "سرور MQTT رایگان", "خرید سرور MQTT", "قیمت سرور اینترنت اشیا", "mqttcloud"],
  alternates: { canonical: "https://mqttcloud.ir/pricing" },
  openGraph: {
    title: "تعرفه بروکر MQTT؛ پلن رایگان و پرداخت ریالی | mqttcloud.ir",
    description: "پلن رایگان برای شروع، پلن‌های پایه و استارتر به تومان، پرداخت با کارت بانکی.",
    url: "https://mqttcloud.ir/pricing",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "تعرفه بروکر MQTT؛ پلن رایگان و پرداخت ریالی" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "تعرفه بروکر MQTT؛ پلن رایگان و پرداخت ریالی | mqttcloud.ir",
    description: "پلن رایگان برای شروع، پلن‌های پایه و استارتر به تومان، پرداخت با کارت بانکی.",
    images: ["/opengraph-image"],
  },
};

// Prices for search results, straight from PLAN_DEFS (what checkout actually
// charges). Plans are priced in toman; schema.org wants ISO 4217, so IRR = toman × 10.
const offer = (name: string, toman: number) => ({
  "@type": "Offer",
  name,
  price: String(toman * 10),
  priceCurrency: "IRR",
  availability: "https://schema.org/InStock",
  url: "https://mqttcloud.ir/pricing",
});

const pricingJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "mqttcloud.ir",
  description: "بروکر MQTT ابری برای اتصال دستگاه‌های اینترنت اشیا با TLS، با داشبورد فارسی و پرداخت ریالی.",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web",
  inLanguage: "fa-IR",
  url: "https://mqttcloud.ir",
  offers: [
    offer("پلن رایگان", PLAN_DEFS.free.priceToman ?? 0),
    offer("پلن پایه", PLAN_DEFS.basic.priceToman ?? 0),
    offer("پلن استارتر", PLAN_DEFS.starter.priceToman ?? 0),
  ],
};

export const dynamic = "force-dynamic";

export default async function PricingPage() {
  await connectDB();
  const rawFaqs = await Faq.find({ active: true }).sort({ order: 1, createdAt: -1 }).select("question answer").lean();
  const faqs = rawFaqs.map((f) => ({ id: String(f._id), question: f.question, answer: f.answer }));
  return (
    <>
      <JsonLd data={pricingJsonLd} />
      <PricingPageClient faqs={faqs} />
    </>
  );
}
