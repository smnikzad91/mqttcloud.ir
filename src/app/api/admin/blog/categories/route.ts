import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import BlogCategory from "@/models/BlogCategory";
import BlogPost from "@/models/BlogPost";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const categories = await BlogCategory.find().sort({ name: 1 }).lean();

  // attach post count for each category
  const withCount = await Promise.all(
    categories.map(async (cat) => ({
      id:          cat._id,
      name:        cat.name,
      description: cat.description,
      postCount:   await BlogPost.countDocuments({ category: cat.name }),
      createdAt:   cat.createdAt,
    }))
  );

  return NextResponse.json(withCount);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name, description } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  await connectDB();
  const existing = await BlogCategory.findOne({ name: name.trim() });
  if (existing) return NextResponse.json({ error: "Category already exists" }, { status: 409 });

  const cat = await BlogCategory.create({ name: name.trim(), description: description?.trim() ?? "" });
  return NextResponse.json({ id: cat._id, name: cat.name }, { status: 201 });
}
