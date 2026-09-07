import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import Ticket from "@/models/Ticket";
import User from "@/models/User";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") return null;
  return session;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await connectDB();

  const ticket = await Ticket.findById(id)
    .populate("userId", "firstName lastName email avatar")
    .lean();
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(ticket);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const msg  = ((body.message ?? "") as string).trim();
  const imgs = Array.isArray(body.images) ? (body.images as string[]).slice(0, 5) : [];

  if (msg.length < 5)
    return NextResponse.json({ error: "Reply must be at least 5 characters." }, { status: 400 });
  if (msg.length > 3000)
    return NextResponse.json({ error: "Reply cannot exceed 3000 characters." }, { status: 400 });

  await connectDB();
  const ticket = await Ticket.findById(id);
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });

  ticket.replies.push({ sender: "admin", message: msg, images: imgs, createdAt: new Date() });
  ticket.status = "answered";
  await ticket.save();

  return NextResponse.json({ success: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { status } = await req.json();

  if (!["open", "answered", "closed"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  await connectDB();
  const ticket = await Ticket.findByIdAndUpdate(id, { status }, { returnDocument: "after" });
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ success: true, status: ticket.status });
}

// keep User import alive (used by populate)
void User;
