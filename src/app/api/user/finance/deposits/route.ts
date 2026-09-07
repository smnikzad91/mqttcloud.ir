import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import Deposit from "@/models/Deposit";
import Card from "@/models/Card";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const deposits = await Deposit.find({ userId: session.user.id })
    .sort({ createdAt: -1 })
    .populate("cardId", "cardNumber bankName ownerName")
    .lean();

  // keep Card import alive
  void Card;

  return NextResponse.json(
    deposits.map((d) => {
      const c = d.cardId as { cardNumber?: string; bankName?: string } | null;
      return {
        id:               d._id,
        amount:           d.amount,
        description:      d.description,
        receiptImage:     d.receiptImage,
        status:           d.status,
        adminNote:        d.adminNote,
        interceptionCode: d.interceptionCode,
        createdAt:        d.createdAt,
        card: c ? {
          cardNumber: c.cardNumber ?? "",
          bankName:   c.bankName   ?? "",
        } : null,
      };
    })
  );
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body         = await req.json();
  const cardId       = ((body.cardId       ?? "") as string).trim();
  const amount       = Number(body.amount  ?? 0);
  const description  = ((body.description  ?? "") as string).trim();
  const receiptImage = ((body.receiptImage ?? "") as string).trim();

  if (!cardId)
    return NextResponse.json({ error: "Card is required." }, { status: 400 });
  if (!Number.isFinite(amount) || amount < 1000)
    return NextResponse.json({ error: "Amount must be at least 1,000 IRT." }, { status: 400 });

  await connectDB();

  const card = await Card.findOne({ _id: cardId, userId: session.user.id });
  if (!card) return NextResponse.json({ error: "Card not found." }, { status: 404 });

  const interceptionCode = `DEP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  const deposit = await Deposit.create({
    userId: session.user.id,
    cardId,
    amount,
    description,
    receiptImage,
    interceptionCode,
  });

  return NextResponse.json({ id: deposit._id, interceptionCode: deposit.interceptionCode }, { status: 201 });
}
