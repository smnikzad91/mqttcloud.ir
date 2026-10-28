import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import Deposit from "@/models/Deposit";
import User from "@/models/User";
import { sendDepositStatusEmail } from "@/lib/mailer";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body   = await req.json();
  const status    = body.status as "approved" | "rejected";
  const adminNote = ((body.adminNote ?? "") as string).trim();

  if (status !== "approved" && status !== "rejected")
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });

  await connectDB();

  // Only a pending deposit can be decided, and the status flip is one atomic
  // update guarded on "pending" — so a double-click, a retried request, or
  // the nodepass webhook landing at the same moment can never credit the
  // wallet twice.
  const deposit = await Deposit.findOneAndUpdate(
    { _id: id, status: "pending" },
    { $set: { status, adminNote } },
    { returnDocument: "after" }
  );
  if (!deposit) {
    const exists = await Deposit.exists({ _id: id });
    return exists
      ? NextResponse.json({ error: "This deposit has already been processed." }, { status: 409 })
      : NextResponse.json({ error: "Deposit not found." }, { status: 404 });
  }

  const user = status === "approved"
    ? await User.findByIdAndUpdate(deposit.userId, { $inc: { walletBalance: deposit.amount } }, { new: true })
    : await User.findById(deposit.userId);

  if (user?.email) {
    sendDepositStatusEmail({
      to:               user.email,
      firstName:        user.firstName,
      amount:           deposit.amount,
      status,
      adminNote,
      interceptionCode: deposit.interceptionCode,
    }).catch(console.error);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  await connectDB();
  const deposit = await Deposit.findById(id);
  if (!deposit) return NextResponse.json({ error: "Deposit not found." }, { status: 404 });
  if (deposit.status !== "rejected")
    return NextResponse.json({ error: "Only rejected deposits can be deleted." }, { status: 403 });

  await deposit.deleteOne();
  return NextResponse.json({ ok: true });
}
