import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import NewsItem from "@/models/NewsItem";
import { notifyNews } from "@/lib/telegram";

interface Params { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await connectDB();
  const item = await NewsItem.findById(id).lean();
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    await notifyNews({ id: String(item._id), title: item.title, hashtags: item.hashtags ?? [], coverImage: item.coverImage ?? undefined });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Telegram error";
    console.error("notifyNews failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
