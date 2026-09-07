import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import Deposit from "@/models/Deposit";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  await connectDB();
  const deposit = await Deposit.findOne({ _id: id, userId: session.user.id });

  if (!deposit) return NextResponse.json({ error: "Deposit not found." }, { status: 404 });
  if (deposit.status === "approved")
    return NextResponse.json({ error: "Approved deposits cannot be deleted." }, { status: 403 });

  await deposit.deleteOne();
  return NextResponse.json({ ok: true });
}
