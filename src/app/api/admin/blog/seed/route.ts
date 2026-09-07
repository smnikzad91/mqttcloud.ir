import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import BlogPost from "@/models/BlogPost";
import { blogPosts } from "@/data/blogPosts";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  let inserted = 0;
  let skipped = 0;

  for (const post of blogPosts) {
    const exists = await BlogPost.findOne({ slug: post.slug });
    if (exists) { skipped++; continue; }
    await BlogPost.create({ ...post, published: true });
    inserted++;
  }

  return NextResponse.json({ inserted, skipped });
}
