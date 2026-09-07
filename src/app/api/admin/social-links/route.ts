import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import SocialLink from "@/models/SocialLink";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await connectDB();
  const links = await SocialLink.find().sort({ order: 1, createdAt: 1 }).lean();
  return NextResponse.json(links.map((l) => ({
    id: l._id, platform: l.platform, url: l.url,
    label: l.label, active: l.active, order: l.order,
  })));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { platform, url, label, active, order } = await req.json();
  if (!platform || !url) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  await connectDB();
  const link = await SocialLink.create({ platform, url, label: label ?? "", active: active ?? true, order: order ?? 0 });
  return NextResponse.json({ id: link._id }, { status: 201 });
}
