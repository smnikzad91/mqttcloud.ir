import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import MqttUser from "@/models/MqttUser";
import MqttClient from "@/models/MqttClient";
import PlanPurchase from "@/models/PlanPurchase";
import { PLAN_DEFS, PAID_SELF_SERVICE_PLANS, type PlanKey } from "@/lib/plans";
import { assertUsageFitsPlan, PlanLimitError } from "@/lib/planEnforcement";
import { createPayment } from "@/lib/nodepass";

const SITE = (process.env.NEXTAUTH_URL ?? "https://mqttcloud.ir").replace(/\/$/, "");

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const targetPlan = body.plan as PlanKey;

  if (!PAID_SELF_SERVICE_PLANS.includes(targetPlan)) {
    return NextResponse.json({ error: "This plan is not available for checkout." }, { status: 400 });
  }

  await connectDB();

  const mqttUserCount = await MqttUser.countDocuments({ userId: session.user.id });
  const credentials = await MqttUser.find({ userId: session.user.id }).select("_id").lean();
  const clientCounts = await Promise.all(credentials.map((c) => MqttClient.countDocuments({ mqttUserId: c._id })));

  try {
    assertUsageFitsPlan(targetPlan, mqttUserCount, clientCounts);
  } catch (err) {
    if (err instanceof PlanLimitError) return NextResponse.json({ error: err.message }, { status: 409 });
    throw err;
  }

  const amountToman = PLAN_DEFS[targetPlan].priceToman as number;

  try {
    const payment = await createPayment({
      amountToman,
      merchantRef: `plan-${session.user.id}-${Date.now()}`,
      ttlMinutes: 30,
      returnUrl: `${SITE}/dashboard/subscription`,
    });

    await PlanPurchase.create({
      userId:            session.user.id,
      targetPlan:        targetPlan as "basic" | "starter", // validated above via PAID_SELF_SERVICE_PLANS
      amountToman,
      nodepassPaymentId: payment.id,
      trackingCode:      payment.trackingCode,
      statusUrl:         payment.statusUrl,
    });

    return NextResponse.json({ statusUrl: payment.statusUrl }, { status: 201 });
  } catch (err) {
    console.error("plan checkout failed:", err);
    const message = err instanceof Error ? err.message : "Payment could not be started.";
    // Cloudflare replaces 502/503/504 bodies with its own generic error page
    // on this zone, so a real 5xx here never reaches the client as JSON.
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
