import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import MqttUser from "@/models/MqttUser";
import MqttClient from "@/models/MqttClient";
import { PLAN_DEFS, SELF_SERVICE_PLANS, resolvePlanLimits, type PlanKey } from "@/lib/plans";

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

  await connectDB();

  const mqttUserCount = await MqttUser.countDocuments({ userId: session.user.id });
  const targetLimits = PLAN_DEFS[targetPlan];

  if (targetLimits.maxUsers !== null && mqttUserCount > targetLimits.maxUsers) {
    return NextResponse.json(
      { error: `You currently have ${mqttUserCount} MQTT credential set(s), which is more than this plan's limit of ${targetLimits.maxUsers}. Remove some before downgrading.` },
      { status: 409 }
    );
  }

  if (targetLimits.clientsPerUser !== null) {
    const credentials = await MqttUser.find({ userId: session.user.id }).select("_id").lean();
    const overLimit = await Promise.all(
      credentials.map((c) => MqttClient.countDocuments({ mqttUserId: c._id }))
    );
    if (overLimit.some((count) => count > targetLimits.clientsPerUser!)) {
      return NextResponse.json(
        { error: `One or more of your credentials has more clients than this plan's limit of ${targetLimits.clientsPerUser}. Remove some before downgrading.` },
        { status: 409 }
      );
    }
  }

  await User.findByIdAndUpdate(session.user.id, {
    $set: { plan: targetPlan, planMaxUsers: null, planClientsPerUser: null },
  });

  return NextResponse.json({ ok: true, plan: targetPlan });
}
