import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import NewsItem from "@/models/NewsItem";
import { notifyNews } from "@/lib/telegram";
import { newsSlugError } from "@/lib/newsSlug";

interface Params { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await connectDB();
  const item = await NewsItem.findById(id).lean();
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    id:          item._id,
    slug:        item.slug ?? "",
    category:    item.category,
    hashtags:    item.hashtags ?? [],
    title:       item.title,
    body:        item.body,
    image:       item.image ?? "",
    coverImage:  item.coverImage ?? "",
    highlight:   item.highlight,
    published:   item.published,
    publishedAt: item.publishedAt,
  });
}

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  if ("slug" in body) {
    body.slug = String(body.slug ?? "").trim().toLowerCase();
    const slugError = newsSlugError(body.slug);
    if (slugError) return NextResponse.json({ error: slugError }, { status: 400 });
  }

  await connectDB();
  if (body.slug && (await NewsItem.exists({ slug: body.slug, _id: { $ne: id } })))
    return NextResponse.json({ error: "Slug already exists" }, { status: 409 });
  if (body.highlight) await NewsItem.updateMany({ _id: { $ne: id } }, { $set: { highlight: false } });
  const previous = await NewsItem.findById(id).lean();
  const item = await NewsItem.findByIdAndUpdate(id, { $set: body }, { returnDocument: "after", runValidators: true });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Send notification when toggling to published
  if (body.published === true && !previous?.published) {
    notifyNews({ id: String(item._id), slug: item.slug, title: item.title, hashtags: item.hashtags ?? [], coverImage: item.coverImage ?? undefined }).catch(console.error);
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
  const item = await NewsItem.findByIdAndDelete(id);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
