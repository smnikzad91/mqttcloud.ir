import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import BlogPost from "@/models/BlogPost";
import { notifyBlog } from "@/lib/telegram";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const posts = await BlogPost.find().sort({ createdAt: -1 }).lean();

  return NextResponse.json(
    posts.map((p) => ({
      id:          p._id,
      slug:        p.slug,
      title:       p.title,
      category:    p.category,
      excerpt:     p.excerpt,
      coverImage:  p.coverImage ?? undefined,
      readTime:    p.readTime,
      sections:    p.sections,
      published:   p.published,
      highlight:   p.highlight ?? false,
      hashtags:    p.hashtags ?? [],
      createdAt:   p.createdAt,
      updatedAt:   p.updatedAt,
    }))
  );
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { slug, category, title, excerpt, readTime, hashtags, sections, highlight, published } = body;

  if (!slug || !category || !title || !excerpt || !readTime) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  await connectDB();

  const existing = await BlogPost.findOne({ slug });
  if (existing) {
    return NextResponse.json({ error: "Slug already exists" }, { status: 409 });
  }

  if (highlight) await BlogPost.updateMany({}, { $set: { highlight: false } });
  const post = await BlogPost.create({ slug, category, title, excerpt, readTime, hashtags: hashtags ?? [], sections: sections ?? [], highlight: highlight ?? false, published: published ?? true });

  if (post.published) {
    void notifyBlog({ slug: post.slug, title: post.title, category: String(post.category), excerpt: post.excerpt, hashtags: post.hashtags ?? [], coverImage: post.coverImage ?? undefined });
  }

  return NextResponse.json({ id: post._id, slug: post.slug }, { status: 201 });
}
