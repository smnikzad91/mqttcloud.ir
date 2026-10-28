import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import MqttUser from "@/models/MqttUser";
import MqttClient from "@/models/MqttClient";
import MqttActivity from "@/models/MqttActivity";
import MqttPayload from "@/models/MqttPayload";
import Card from "@/models/Card";
import { PLAN_SUBSCRIPTION_DAYS } from "@/lib/plans";
import { sendPlanChangedSms, newClientSmsId } from "@/lib/sms";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { role, phone, plan, planMaxUsers, planClientsPerUser } = body;

  if (plan !== undefined && !["free", "basic", "starter", "enterprise"].includes(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  await connectDB();

  const update: Record<string, unknown> = {};
  if (role !== undefined) update.role = role;
  if (phone !== undefined) {
    update.phone = phone;
    // Same rule as self-service: a different number needs its own OTP.
    const current = await User.findById(id).select("phone").lean();
    if (phone !== "" && phone !== (current?.phone ?? "")) update.phoneVerified = false;
  }
  if (plan !== undefined) {
    update.plan = plan;
    // basic/starter behave as a normal 30-day subscription even when
    // admin-assigned; free/enterprise never expire through this mechanism.
    update.planExpiresAt = plan === "basic" || plan === "starter"
      ? new Date(Date.now() + PLAN_SUBSCRIPTION_DAYS * 24 * 60 * 60 * 1000)
      : null;
    update.planReminderSentAt = null;
  }
  if (planMaxUsers !== undefined) update.planMaxUsers = planMaxUsers === null ? null : Number(planMaxUsers);
  if (planClientsPerUser !== undefined) update.planClientsPerUser = planClientsPerUser === null ? null : Number(planClientsPerUser);

  const user = await User.findByIdAndUpdate(id, { $set: update }, { returnDocument: "after" }).lean();
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (plan !== undefined && user.phone) {
    sendPlanChangedSms(user.phone, plan, newClientSmsId("planchange")).catch(console.error);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  if (id === session.user.id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  await connectDB();
  const user = await User.findByIdAndDelete(id);
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Remove everything that lets the account keep using the broker: with its
  // MqttUser rows gone, the broker can no longer authenticate its devices.
  // (Sessions already connected stay up until they disconnect.) Deposits,
  // tickets and plan purchases are kept as billing/support history.
  await Promise.all([
    MqttUser.deleteMany({ userId: id }),
    MqttClient.deleteMany({ userId: id }),
    MqttActivity.deleteMany({ userId: id }),
    MqttPayload.deleteMany({ userId: id }),
    Card.deleteMany({ userId: id }),
  ]);

  return NextResponse.json({ ok: true });
}
