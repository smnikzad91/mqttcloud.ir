import { Metadata } from "next";
import { pageMetadata } from "@/lib/pageSeo";
import ContactPageClient from "@/components/public/ContactPageClient";
import { JsonLd } from "@/components/common/JsonLd";

// Title, description and keywords are editable in /admin/seo-settings (src/lib/pageSeo.ts).
export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata("contact");
}

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
