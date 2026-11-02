import { connectDB } from "@/lib/mongodb";
import MqttUser from "@/models/MqttUser";
import MqttPayload from "@/models/MqttPayload";
import PowerReading from "@/models/PowerReading";

import { POWER_SOURCE, parseTelemetry } from "@/lib/powerSource";

export { POWER_SOURCE, POWER_CHANNELS, parseTelemetry, type PowerSample } from "@/lib/powerSource";

export async function powerCredentialId() {
  const cred = await MqttUser.findOne({ username: POWER_SOURCE.username }).select("_id").lean();
  return cred?._id ?? null;
}

/**
 * Copies new telemetry from the 7-day message log into PowerReading. Runs from
 * instrumentation.ts every minute; idempotent (keyed on the source payload id),
 * so after downtime it simply catches up from the log.
 */
export async function archivePowerReadings(): Promise<number> {
  await connectDB();
  const credId = await powerCredentialId();
  if (!credId) return 0;

  const last = await PowerReading.findOne().sort({ ts: -1 }).select("ts").lean();
  let since = last?.ts ?? null;
  let copied = 0;
  const BATCH = 2000;
  for (;;) {
    const rows = await MqttPayload.find({
      mqttUserId: credId,
      topic: POWER_SOURCE.topic,
      ...(since ? { createdAt: { $gte: since } } : {}),
    }).sort({ createdAt: 1 }).limit(BATCH).select("_id payload createdAt").lean();

    const ops = rows.flatMap((r) => {
      const s = parseTelemetry(r.payload);
      return s ? [{ updateOne: { filter: { payloadId: r._id }, update: { $setOnInsert: { payloadId: r._id, ts: r.createdAt, ...s } }, upsert: true } }] : [];
    });
    if (ops.length) copied += (await PowerReading.bulkWrite(ops, { ordered: false })).upsertedCount;
    if (rows.length < BATCH) break;
    since = rows[rows.length - 1].createdAt;
  }
  return copied;
}
