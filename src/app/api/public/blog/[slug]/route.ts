import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import BlogPost from "@/models/BlogPost";

interface Params { params: Promise<{ slug: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { slug } = await params;
  await connectDB();

  const post = await BlogPost.findOne({ slug, published: true }).lean();
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    slug:     post.slug,
    category: post.category,
    title:    post.title,
    excerpt:  post.excerpt,
    createdAt: post.createdAt,
    readTime: post.readTime,
    sections: post.sections,
  });
}
