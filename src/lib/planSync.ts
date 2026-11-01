import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import MqttUser from "@/models/MqttUser";
import { resolvePlanLimits } from "@/lib/plans";

/**
 * Bring an account's MQTT credential sets in line with its current plan.
 *
 * The broker (broker-service) enforces two stored fields per credential set:
 * `maxConnection` (concurrent connections) and `planBlocked` (refused
 * outright). Both used to be written only at creation, so a plan change never
 * reached the broker. Call this after every change to a user's plan or to
 * their set of credentials:
 *
 * - the oldest `maxUsers` credential sets stay allowed, capped at the plan's
 *   `clientsPerUser` live connections each;
 * - any further credential sets are paused by plan (`planBlocked`), so after
 *   a paid plan expires to free, devices beyond the free limits are refused
 *   and, within ~30 s, disconnected by the broker's enforcement sweep.
 *
 * A credential the user or an admin suspended (`isActive: false`) stays
 * suspended; this only touches the plan fields. Enterprise accounts without
 * custom limits resolve to 0 and are left as they are, rather than paused.
 */
export async function syncCredentialsToPlan(userId: string): Promise<void> {
  await connectDB();
  const user = await User.findById(userId).select("plan planMaxUsers planClientsPerUser").lean();
  if (!user) return;

  const { maxUsers, clientsPerUser } = resolvePlanLimits(user);
  if (maxUsers <= 0 || clientsPerUser <= 0) return;

  const creds = await MqttUser.find({ userId }).sort({ createdAt: 1 }).select("_id").lean();
  const allowed = creds.slice(0, maxUsers).map((c) => c._id);
  const paused = creds.slice(maxUsers).map((c) => c._id);

  await Promise.all([
    allowed.length && MqttUser.updateMany({ _id: { $in: allowed } }, { $set: { planBlocked: false, maxConnection: clientsPerUser } }),
    paused.length && MqttUser.updateMany({ _id: { $in: paused } }, { $set: { planBlocked: true } }),
  ]);
}
