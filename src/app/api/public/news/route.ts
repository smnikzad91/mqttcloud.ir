import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import NewsItem from "@/models/NewsItem";

export async function GET() {
  await connectDB();
  const items = await NewsItem.find({ published: true })
    .sort({ publishedAt: -1 })
    .lean();

  return NextResponse.json(
    items.map((n) => ({
      id:          n._id,
      category:    n.category,
      hashtags:    n.hashtags ?? [],
      title:       n.title,
      body:        n.body,
      image:       n.image ?? undefined,
      highlight:       n.highlight,
      publishedAt: n.publishedAt,
    }))
  );
}
