import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import NewsTag from "@/models/NewsTag";
import NewsItem from "@/models/NewsItem";

interface Params { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { name, description } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  await connectDB();
  const tag = await NewsTag.findById(id);
  if (!tag) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const oldName = tag.name;
  tag.name = name.trim();
  tag.description = description?.trim() ?? "";
  await tag.save();

  if (oldName !== tag.name) {
    await NewsItem.updateMany({ tag: oldName }, { $set: { tag: tag.name } });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await connectDB();
  const tag = await NewsTag.findByIdAndDelete(id);
  if (!tag) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
