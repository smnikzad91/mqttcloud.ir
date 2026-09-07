import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import BlogPost from "@/models/BlogPost";

export async function GET() {
  await connectDB();
  const posts = await BlogPost.find({ published: true })
    .sort({ createdAt: -1 })
    .select("slug category title excerpt createdAt readTime")
    .lean();

  return NextResponse.json(
    posts.map((p) => ({
      slug:     p.slug,
      category: p.category,
      title:    p.title,
      excerpt:  p.excerpt,
      createdAt: p.createdAt,
      readTime: p.readTime,
    }))
  );
}
