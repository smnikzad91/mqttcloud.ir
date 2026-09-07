import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import Card from "@/models/Card";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const cards = await Card.find({ userId: session.user.id }).sort({ createdAt: -1 }).lean();

  return NextResponse.json(
    cards.map((c) => ({
      id:         c._id,
      cardNumber: c.cardNumber,
      ownerName:  c.ownerName,
      bankName:   c.bankName,
      createdAt:  c.createdAt,
    }))
  );
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body       = await req.json();
  const cardNumber = ((body.cardNumber ?? "") as string).replace(/\s/g, "");
  const ownerName  = ((body.ownerName  ?? "") as string).trim();
  const bankName   = ((body.bankName   ?? "") as string).trim();

  if (!/^\d{16}$/.test(cardNumber))
    return NextResponse.json({ error: "Card number must be exactly 16 digits." }, { status: 400 });
  if (!ownerName)
    return NextResponse.json({ error: "Owner name is required." }, { status: 400 });
  if (!bankName)
    return NextResponse.json({ error: "Bank name is required." }, { status: 400 });

  await connectDB();

  try {
    const card = await Card.create({ userId: session.user.id, cardNumber, ownerName, bankName });
    return NextResponse.json({ id: card._id }, { status: 201 });
  } catch (err: unknown) {
    if ((err as { code?: number }).code === 11000)
      return NextResponse.json({ error: "This card number is already registered." }, { status: 409 });
    throw err;
  }
}
