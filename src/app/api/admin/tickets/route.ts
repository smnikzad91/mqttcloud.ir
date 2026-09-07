import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import Ticket from "@/models/Ticket";
import User from "@/models/User";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const tickets = await Ticket.find()
    .sort({ updatedAt: -1 })
    .populate("userId", "firstName lastName email")
    .lean();

  return NextResponse.json(
    tickets.map((t) => {
      const u = t.userId as { firstName?: string; lastName?: string; email?: string } | null;
      return {
        id:         t._id,
        subject:    t.subject,
        status:     t.status,
        replyCount: t.replies.length,
        createdAt:  t.createdAt,
        updatedAt:  t.updatedAt,
        user: u ? {
          name:  `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim(),
          email: u.email ?? "",
        } : null,
        lastReply: t.replies.length > 0
          ? { sender: t.replies[t.replies.length - 1].sender }
          : null,
      };
    })
  );
}

// keep User import alive (used by populate)
void User;
