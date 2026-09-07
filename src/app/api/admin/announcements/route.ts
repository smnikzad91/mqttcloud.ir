import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import Announcement from "@/models/Announcement";
import { notifyAnnouncement } from "@/lib/telegram";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await connectDB();
  const items = await Announcement.find().sort({ order: 1, createdAt: -1 });
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await connectDB();
  const body = await req.json();
  const item = await Announcement.create(body);

  if (item.active) {
    void notifyAnnouncement({ text: item.text, emoji: item.emoji, link: item.link, linkText: item.linkText });
  }

  return NextResponse.json(item, { status: 201 });
}
