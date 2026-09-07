import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import Ticket from "@/models/Ticket";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const tickets = await Ticket.find({ userId: session.user.id })
    .select("subject status createdAt updatedAt replies")
    .sort({ updatedAt: -1 })
    .lean();

  return NextResponse.json(tickets.map((t) => ({
    id:           t._id,
    subject:      t.subject,
    status:       t.status,
    replyCount:   t.replies.length,
    createdAt:    t.createdAt,
    updatedAt:    t.updatedAt,
    lastReply:    t.replies.length > 0
      ? { sender: t.replies[t.replies.length - 1].sender }
      : null,
  })));
}

const SUBJECT_MIN = 5;
const SUBJECT_MAX = 200;
const MESSAGE_MIN = 20;
const MESSAGE_MAX = 3000;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const sub  = ((body.subject ?? "") as string).trim();
  const msg  = ((body.message ?? "") as string).trim();
  const imgs = Array.isArray(body.images) ? (body.images as string[]).slice(0, 5) : [];

  if (sub.length < SUBJECT_MIN)
    return NextResponse.json({ error: `Subject must be at least ${SUBJECT_MIN} characters.` }, { status: 400 });
  if (sub.length > SUBJECT_MAX)
    return NextResponse.json({ error: `Subject cannot exceed ${SUBJECT_MAX} characters.` }, { status: 400 });
  if (msg.length < MESSAGE_MIN)
    return NextResponse.json({ error: `Message must be at least ${MESSAGE_MIN} characters.` }, { status: 400 });
  if (msg.length > MESSAGE_MAX)
    return NextResponse.json({ error: `Message cannot exceed ${MESSAGE_MAX} characters.` }, { status: 400 });

  await connectDB();
  const ticket = await Ticket.create({
    userId:  session.user.id,
    subject: sub,
    message: msg,
    images:  imgs,
  });

  return NextResponse.json({ id: ticket._id }, { status: 201 });
}
