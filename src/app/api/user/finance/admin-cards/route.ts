import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import AdminCard from "@/models/AdminCard";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const cards = await AdminCard.find().sort({ createdAt: 1 }).lean();

  return NextResponse.json(cards.map((c) => ({
    id:         c._id,
    cardNumber: c.cardNumber,
    ownerName:  c.ownerName,
    bankName:   c.bankName,
  })));
}
