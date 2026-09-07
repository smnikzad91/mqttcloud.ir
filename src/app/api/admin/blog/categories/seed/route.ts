import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import BlogCategory from "@/models/BlogCategory";
import BlogPost from "@/models/BlogPost";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  // collect all distinct category names from posts
  const names: string[] = await BlogPost.distinct("category");

  let inserted = 0;
  let skipped = 0;

  for (const name of names) {
    const exists = await BlogCategory.findOne({ name });
    if (exists) { skipped++; continue; }
    await BlogCategory.create({ name });
    inserted++;
  }

  return NextResponse.json({ inserted, skipped });
}
