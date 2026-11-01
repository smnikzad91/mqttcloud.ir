import { Metadata } from "next";
import ContactPageClient from "@/components/public/ContactPageClient";
import { JsonLd } from "@/components/common/JsonLd";

export const metadata: Metadata = {
  title: "تماس با پشتیبانی",
  description: "سوالی درباره بروکر MQTT، پلن‌ها یا اتصال دستگاه‌ها دارید؟ از طریق فرم تماس یا تیکت پشتیبانی، به زبان فارسی با تیم mqttcloud.ir در ارتباط باشید.",
  keywords: ["پشتیبانی MQTT", "تماس با mqttcloud", "پشتیبانی اینترنت اشیا", "mqttcloud"],
  alternates: { canonical: "https://mqttcloud.ir/contact" },
  openGraph: {
    title: "تماس با پشتیبانی | mqttcloud.ir",
    description: "پشتیبانی فارسی برای بروکر MQTT، پلن‌ها و اتصال دستگاه‌ها.",
    url: "https://mqttcloud.ir/contact",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "تماس با پشتیبانی" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "تماس با پشتیبانی | mqttcloud.ir",
    description: "پشتیبانی فارسی برای بروکر MQTT، پلن‌ها و اتصال دستگاه‌ها.",
    images: ["/opengraph-image"],
  },
};

const contactJsonLd = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  name: "تماس با پشتیبانی mqttcloud.ir",
  url: "https://mqttcloud.ir/contact",
  inLanguage: "fa-IR",
  about: { "@type": "Organization", name: "mqttcloud.ir", url: "https://mqttcloud.ir" },
};

export default function ContactPage() {
  return (
    <>
      <JsonLd data={contactJsonLd} />
      <ContactPageClient />
    </>
  );
}
