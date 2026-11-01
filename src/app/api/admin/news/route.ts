import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import NewsItem from "@/models/NewsItem";
import { notifyNews } from "@/lib/telegram";
import { newsSlugError } from "@/lib/newsSlug";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const items = await NewsItem.find().sort({ publishedAt: -1 }).lean();

  return NextResponse.json(
    items.map((n) => ({
      id:          n._id,
      slug:        n.slug ?? "",
      category:    n.category,
      hashtags:    n.hashtags ?? [],
      title:       n.title,
      body:        n.body,
      image:       n.image ?? undefined,
      coverImage:  n.coverImage ?? undefined,
      highlight:   n.highlight,
      published:   n.published,
      publishedAt: n.publishedAt,
      createdAt:   n.createdAt,
    }))
  );
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { category, hashtags, title, body: text, image, coverImage, highlight, published, publishedAt } = body;
  const slug = String(body.slug ?? "").trim().toLowerCase();

  if (!category || !title || !text) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  const slugError = newsSlugError(slug);
  if (slugError) return NextResponse.json({ error: slugError }, { status: 400 });

  await connectDB();
  if (await NewsItem.exists({ slug })) return NextResponse.json({ error: "Slug already exists" }, { status: 409 });
  if (highlight) await NewsItem.updateMany({}, { $set: { highlight: false } });
  const item = await NewsItem.create({
    slug,
    category,
    hashtags: hashtags ?? [],
    title,
    body: text,
    image: image ?? undefined,
    coverImage: coverImage ?? undefined,
    highlight: highlight ?? false,
    published: published ?? true,
    publishedAt: publishedAt ? new Date(publishedAt) : new Date(),
  });

  if (item.published) {
    void notifyNews({ id: String(item._id), slug: item.slug, title: item.title, hashtags: item.hashtags ?? [], coverImage: item.coverImage ?? undefined });
  }

  return NextResponse.json({ id: item._id, slug: item.slug }, { status: 201 });
}
