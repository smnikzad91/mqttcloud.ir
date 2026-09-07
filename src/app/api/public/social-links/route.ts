import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import SocialLink from "@/models/SocialLink";

export async function GET() {
  await connectDB();
  const links = await SocialLink.find({ active: true }).sort({ order: 1, createdAt: 1 }).lean();
  return NextResponse.json(links.map((l) => ({
    id: l._id, platform: l.platform, url: l.url, label: l.label,
  })));
}
