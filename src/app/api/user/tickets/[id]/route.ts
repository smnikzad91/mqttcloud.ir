import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import Ticket from "@/models/Ticket";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();

  const ticket = await Ticket.findOne({ _id: id, userId: session.user.id }).lean();
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(ticket);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const msg  = ((body.message ?? "") as string).trim();
  const imgs = Array.isArray(body.images) ? (body.images as string[]).slice(0, 5) : [];

  if (msg.length < 5)
    return NextResponse.json({ error: "Reply must be at least 5 characters." }, { status: 400 });
  if (msg.length > 3000)
    return NextResponse.json({ error: "Reply cannot exceed 3000 characters." }, { status: 400 });

  await connectDB();

  const ticket = await Ticket.findOne({ _id: id, userId: session.user.id });
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (ticket.status === "closed") {
    return NextResponse.json({ error: "Ticket is closed" }, { status: 400 });
  }

  ticket.replies.push({ sender: "user", message: msg, images: imgs, createdAt: new Date() });
  ticket.status = "open";
  await ticket.save();

  return NextResponse.json({ success: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { status } = await req.json();

  if (status !== "closed") return NextResponse.json({ error: "Invalid status" }, { status: 400 });

  await connectDB();
  const ticket = await Ticket.findOne({ _id: id, userId: session.user.id });
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });

  ticket.status = "closed";
  await ticket.save();

  return NextResponse.json({ success: true });
}
