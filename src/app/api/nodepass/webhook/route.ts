import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { verifyWebhook } from "@/lib/nodepass";
import Deposit from "@/models/Deposit";
import PlanPurchase from "@/models/PlanPurchase";
import { handleDepositWebhook, handlePlanPurchaseWebhook } from "@/lib/nodepassWebhooks";

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const evt = verifyWebhook(raw, req.headers);
  if (!evt) return new Response("bad signature", { status: 401 });

  await connectDB();

  const { event, payment } = evt;

  const deposit = await Deposit.findOne({ nodepassPaymentId: payment.id });
  if (deposit) {
    await handleDepositWebhook(deposit, event, payment);
    return NextResponse.json({ ok: true });
  }

  const purchase = await PlanPurchase.findOne({ nodepassPaymentId: payment.id });
  if (purchase) {
    await handlePlanPurchaseWebhook(purchase, event);
    return NextResponse.json({ ok: true });
  }

  console.error(`[nodepass webhook] no local record for payment ${payment.id} (merchantRef ${payment.merchantRef})`);
  return NextResponse.json({ ok: true });
}
