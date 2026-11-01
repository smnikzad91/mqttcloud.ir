import { Metadata } from "next";
import { pageMetadata } from "@/lib/pageSeo";
import LegalPageClient from "@/components/public/LegalPageClient";

// Title, description and keywords are editable in /admin/seo-settings (src/lib/pageSeo.ts).
export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata("privacy");
}

export default function PrivacyPage() {
  return <LegalPageClient type="privacy" />;
}
