import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

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
  if (phone !== undefined) update.phone = phone;
  if (plan !== undefined) update.plan = plan;
  if (planMaxUsers !== undefined) update.planMaxUsers = planMaxUsers === null ? null : Number(planMaxUsers);
  if (planClientsPerUser !== undefined) update.planClientsPerUser = planClientsPerUser === null ? null : Number(planClientsPerUser);

  const user = await User.findByIdAndUpdate(id, { $set: update }, { returnDocument: "after" }).lean();
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

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
  await User.findByIdAndDelete(id);

  return NextResponse.json({ ok: true });
}
