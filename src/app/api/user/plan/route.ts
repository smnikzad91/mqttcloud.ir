import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import MqttUser from "@/models/MqttUser";
import MqttClient from "@/models/MqttClient";
import { PLAN_DEFS, SELF_SERVICE_PLANS, resolvePlanLimits, type PlanKey } from "@/lib/plans";
import { assertUsageFitsPlan, PlanLimitError } from "@/lib/planEnforcement";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const user = await User.findById(session.user.id).select("plan planMaxUsers planClientsPerUser").lean();
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const limits = resolvePlanLimits(user);
  const mqttUserCount = await MqttUser.countDocuments({ userId: session.user.id });

  // Per-credential client counts, so the UI can show "3/5" against each one.
  const credentials = await MqttUser.find({ userId: session.user.id }).select("_id username").lean();
  const clientCounts = await Promise.all(
    credentials.map(async (c) => ({
      mqttUserId: c._id,
      username:   c.username,
      count:      await MqttClient.countDocuments({ mqttUserId: c._id }),
    }))
  );

  return NextResponse.json({
    plan: user.plan ?? "free",
    limits,
    usage: {
      mqttUsers: mqttUserCount,
      clients:   clientCounts,
    },
  });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const targetPlan = body.plan as PlanKey;

  if (!SELF_SERVICE_PLANS.includes(targetPlan)) {
    return NextResponse.json(
      { error: "This plan requires direct sales contact. Please use the contact form." },
      { status: 400 }
    );
  }
  // Paid plans go through nodepass checkout — this route only ever applies
  // the switch for free, instantly, since there's nothing to collect.
  if ((PLAN_DEFS[targetPlan].priceToman ?? 0) > 0) {
    return NextResponse.json(
      { error: "This plan requires payment. Use the checkout endpoint instead." },
      { status: 400 }
    );
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

  await User.findByIdAndUpdate(session.user.id, {
    $set: { plan: targetPlan, planMaxUsers: null, planClientsPerUser: null },
  });

  return NextResponse.json({ ok: true, plan: targetPlan });
}
