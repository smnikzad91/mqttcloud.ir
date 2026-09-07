import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import NewsTag from "@/models/NewsTag";
import NewsItem from "@/models/NewsItem";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const tags = await NewsTag.find().sort({ name: 1 }).lean();

  const withCount = await Promise.all(
    tags.map(async (tag) => ({
      id:          tag._id,
      name:        tag.name,
      description: tag.description,
      itemCount:   await NewsItem.countDocuments({ category: tag.name }),
      createdAt:   tag.createdAt,
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
  const existing = await NewsTag.findOne({ name: name.trim() });
  if (existing) return NextResponse.json({ error: "Tag already exists" }, { status: 409 });

  const tag = await NewsTag.create({ name: name.trim(), description: description?.trim() ?? "" });
  return NextResponse.json({ id: tag._id, name: tag.name }, { status: 201 });
}
