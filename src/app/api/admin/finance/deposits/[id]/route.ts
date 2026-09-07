import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import Deposit from "@/models/Deposit";
import User from "@/models/User";

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
  void User;

  const deposit = await Deposit.findById(id);
  if (!deposit) return NextResponse.json({ error: "Deposit not found." }, { status: 404 });

  deposit.status    = status;
  deposit.adminNote = adminNote;
  await deposit.save();

  if (status === "approved") {
    await User.findByIdAndUpdate(deposit.userId, { $inc: { walletBalance: deposit.amount } });
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
