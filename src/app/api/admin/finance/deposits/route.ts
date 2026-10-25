import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import Deposit from "@/models/Deposit";
import User from "@/models/User";
import Card from "@/models/Card";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  // keep imports alive for populate
  void User;
  void Card;

  const deposits = await Deposit.find()
    .sort({ createdAt: -1 })
    .populate("userId", "firstName lastName email")
    .populate("cardId", "cardNumber bankName ownerName")
    .lean();

  return NextResponse.json(
    deposits.map((d) => {
      const u = d.userId as { firstName?: string; lastName?: string; email?: string } | null;
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
        user: u ? {
          name:  `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim(),
          email: u.email ?? "",
        } : null,
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
        } : null,
      };
    })
  );
}
