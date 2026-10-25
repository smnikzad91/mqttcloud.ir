import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import MqttUser from "@/models/MqttUser";
import User from "@/models/User";
import { assertCanCreateMqttUser, PlanLimitError } from "@/lib/planEnforcement";
import { resolvePlanLimits } from "@/lib/plans";

const USERNAME_RE = /^[a-zA-Z0-9_-]{3,32}$/;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const credentials = await MqttUser.find({ userId: session.user.id })
    .sort({ createdAt: -1 })
    .select("-password")
    .lean();

  return NextResponse.json(
    credentials.map((c) => ({
      id:            c._id,
      username:      c.username,
      isActive:      c.isActive,
      maxConnection: c.maxConnection,
      createdAt:     c.createdAt,
    }))
  );
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body     = await req.json();
  const username = ((body.username ?? "") as string).trim().toLowerCase();
  const password = (body.password ?? "") as string;

  if (!USERNAME_RE.test(username))
    return NextResponse.json({ error: "Username must be 3-32 letters, numbers, - or _." }, { status: 400 });
  if (password.length < 6)
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });

  await connectDB();

  const existing = await MqttUser.findOne({ username });
  if (existing) return NextResponse.json({ error: "Username already taken." }, { status: 409 });

  const currentCount = await MqttUser.countDocuments({ userId: session.user.id });
  try {
    await assertCanCreateMqttUser(session.user.id, currentCount);
  } catch (err) {
    if (err instanceof PlanLimitError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }

  const owner = await User.findById(session.user.id).select("plan planMaxUsers planClientsPerUser").lean();
  const { clientsPerUser } = resolvePlanLimits(owner ?? {});

  const hashed = await bcrypt.hash(password, 12);
  const credential = await MqttUser.create({
    userId: session.user.id,
    username,
    password: hashed,
    maxConnection: clientsPerUser,
  });

  return NextResponse.json(
    { id: credential._id, username: credential.username, isActive: credential.isActive, maxConnection: credential.maxConnection },
    { status: 201 }
  );
}
