import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import BlogPost from "@/models/BlogPost";
import { notifyBlog } from "@/lib/telegram";

interface Params { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await connectDB();
  const post = await BlogPost.findById(id).lean();
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    await notifyBlog({
      slug:       post.slug,
      title:      post.title,
      category:   String(post.category),
      excerpt:    post.excerpt,
      hashtags:   post.hashtags ?? [],
      readTime:   post.readTime ?? undefined,
      coverImage: post.coverImage ?? undefined,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Telegram error";
    console.error("notifyBlog failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
