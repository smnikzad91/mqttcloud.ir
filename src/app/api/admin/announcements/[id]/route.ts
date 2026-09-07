import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import Announcement from "@/models/Announcement";
import { notifyAnnouncement } from "@/lib/telegram";

interface Params { params: Promise<{ id: string }> }

export async function PUT(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await connectDB();
  const body     = await req.json();
  const previous = await Announcement.findById(id).lean();
  const item     = await Announcement.findByIdAndUpdate(id, { $set: body }, { returnDocument: "after" });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Notify when toggling to active
  if (body.active === true && !previous?.active) {
    void notifyAnnouncement({ text: item.text, emoji: item.emoji, link: item.link, linkText: item.linkText });
  }

  return NextResponse.json(item);
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await connectDB();
  await Announcement.findByIdAndDelete(id);
  return NextResponse.json({ ok: true });
}
