import { Metadata } from "next";
import { pageMetadata } from "@/lib/pageSeo";
import LegalPageClient from "@/components/public/LegalPageClient";
import { connectDB } from "@/lib/mongodb";
import LegalPage from "@/models/LegalPage";

async function loadLegal() {
  await connectDB();
  return LegalPage.findOne({ type: "privacy" }).select("title content updatedAt").lean<{ title?: string; content?: string; updatedAt?: Date }>().catch(() => null);
}

// Title, description and keywords are editable in /admin/seo-settings (src/lib/pageSeo.ts).
// Until the text is written in /admin (legal pages), keep the empty page out of Google.
export async function generateMetadata(): Promise<Metadata> {
  const meta = await pageMetadata("privacy");
  const doc = await loadLegal();
  return doc?.content?.trim() ? meta : { ...meta, robots: { index: false, follow: true } };
}

export default async function PrivacyPage() {
  const doc = await loadLegal();
  const data = doc ? { title: doc.title ?? "", content: doc.content ?? "", updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : undefined } : null;
  return <LegalPageClient type="privacy" data={data} />;
}
