import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import MqttPayload from "@/models/MqttPayload";
import MqttClient from "@/models/MqttClient";
import { POWER_SOURCE, parseTelemetry, powerCredentialId } from "@/lib/powerMonitor";

// Latest reading straight from the message log (fresher than the archive,
// which copies once a minute) plus the device's connection state.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await connectDB();
  const credId = await powerCredentialId();
  if (!credId) return NextResponse.json({ latest: null, device: null });

  const [last, device] = await Promise.all([
    MqttPayload.findOne({ mqttUserId: credId, topic: POWER_SOURCE.topic }).sort({ createdAt: -1 }).select("payload createdAt").lean(),
    MqttClient.findOne({ mqttUserId: credId, clientName: POWER_SOURCE.clientName }).select("isOnline lastSeenAt").lean(),
  ]);
  const sample = last ? parseTelemetry(last.payload) : null;

  return NextResponse.json({
    latest: last && sample ? { ts: last.createdAt, ...sample } : null,
    device: device ? { isOnline: device.isOnline, lastSeenAt: device.lastSeenAt } : null,
  });
}
