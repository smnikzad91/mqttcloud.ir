import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import Deposit from "@/models/Deposit";
import Card from "@/models/Card";
import { createPayment } from "@/lib/nodepass";

const SITE = (process.env.NEXTAUTH_URL ?? "https://mqttcloud.ir").replace(/\/$/, "");

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const deposits = await Deposit.find({ userId: session.user.id })
    .sort({ createdAt: -1 })
    .populate("cardId", "cardNumber bankName ownerName")
    .lean();

  // keep Card import alive — still needed for GET's populate("cardId", ...)
  // on any legacy pre-nodepass deposits that have one
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
        // Legacy manual deposits populate a real Card; nodepass-routed ones
        // never set cardId, so fall back to the receiving-card snapshot
        // nodepass returned at payment-creation time — same shape either way.
        card: c
          ? { cardNumber: c.cardNumber ?? "", bankName: c.bankName ?? "" }
          : d.payCardNumber
            ? { cardNumber: d.payCardNumber, bankName: d.payCardBankName ?? "" }
            : null,
        payment: d.nodepassPaymentId ? {
          trackingCode: d.trackingCode ?? "",
          payableRial:  d.payableRial ?? "",
          statusUrl:    d.statusUrl ?? "",
        } : null,
      };
    })
  );
}

// Deposits are collected through nodepass.ir — a real card-to-card payment
// confirmed by reading the receiving bank's deposit SMS. We never pick an
// admin card or ask for a receipt upload anymore: nodepass assigns the
// receiving card per-payment and confirms it automatically via webhook
// (see /api/nodepass/webhook), which is what actually credits the wallet.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body   = await req.json();
  const amount = Number(body.amount ?? 0);

  if (!Number.isFinite(amount) || amount < 10000)
    return NextResponse.json({ error: "حداقل مبلغ واریز ۱۰,۰۰۰ تومان است." }, { status: 400 });

  await connectDB();

  try {
    const payment = await createPayment({
      amountToman: amount,
      merchantRef: `deposit-${session.user.id}-${Date.now()}`,
      ttlMinutes:  30,
      returnUrl:   `${SITE}/dashboard/finance`,
    });

    const deposit = await Deposit.create({
      userId: session.user.id,
      amount,
      nodepassPaymentId: payment.id,
      trackingCode:      payment.trackingCode,
      payableRial:       payment.payableRial,
      payCardNumber:     payment.card.number,
      payCardOwnerName:  payment.card.ownerName,
      payCardBankName:   payment.card.bankName,
      statusUrl:         payment.statusUrl,
    });

    return NextResponse.json(
      { id: deposit._id, interceptionCode: deposit.interceptionCode, statusUrl: payment.statusUrl },
      { status: 201 }
    );
  } catch (err) {
    console.error("deposit checkout failed:", err);
    const message = err instanceof Error ? err.message : "پرداخت ایجاد نشد. لطفاً دوباره تلاش کنید.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
