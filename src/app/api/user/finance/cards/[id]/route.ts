import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import Card from "@/models/Card";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  await connectDB();
  const card = await Card.findOneAndDelete({ _id: id, userId: session.user.id });

  if (!card) return NextResponse.json({ error: "Card not found." }, { status: 404 });

  return NextResponse.json({ ok: true });
}
