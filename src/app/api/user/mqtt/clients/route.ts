import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import MqttClient from "@/models/MqttClient";
import MqttUser from "@/models/MqttUser";
import { assertCanCreateMqttClient, PlanLimitError } from "@/lib/planEnforcement";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  void MqttUser;

  const clients = await MqttClient.find({ userId: session.user.id })
    .sort({ createdAt: -1 })
    .populate("mqttUserId", "username")
    .lean();

  return NextResponse.json(
    clients.map((c) => {
      const cred = c.mqttUserId as unknown as { _id: string; username?: string } | null;
      return {
        id:          c._id,
        clientName:  c.clientName,
        isOnline:    c.isOnline,
        lastSeenAt:  c.lastSeenAt,
        createdAt:   c.createdAt,
        credential: cred ? { id: cred._id, username: cred.username ?? "" } : null,
      };
    })
  );
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body       = await req.json();
  const mqttUserId = ((body.mqttUserId ?? "") as string).trim();
  const clientName = ((body.clientName ?? "") as string).trim();

  if (!mqttUserId) return NextResponse.json({ error: "Credential is required." }, { status: 400 });
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(clientName))
    return NextResponse.json({ error: "Client id must be 1-64 letters, numbers, - or _." }, { status: 400 });

  await connectDB();

  const credential = await MqttUser.findOne({ _id: mqttUserId, userId: session.user.id });
  if (!credential) return NextResponse.json({ error: "Credential not found." }, { status: 404 });

  const count = await MqttClient.countDocuments({ mqttUserId });
  try {
    await assertCanCreateMqttClient(session.user.id, count);
  } catch (err) {
    if (err instanceof PlanLimitError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }

  const existing = await MqttClient.findOne({ mqttUserId, clientName });
  if (existing) return NextResponse.json({ error: "Client id already exists for this credential." }, { status: 409 });

  const client = await MqttClient.create({
    userId: session.user.id,
    mqttUserId,
    clientName,
  });

  return NextResponse.json({ id: client._id, clientName: client.clientName }, { status: 201 });
}
