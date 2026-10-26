import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { sendPlanExpiringSoonSms, sendPlanExpiredSms, newClientSmsId } from "@/lib/sms";
import { PLAN_REMINDER_DAYS_BEFORE } from "@/lib/plans";

// Runs on a timer from instrumentation.ts. Only ever touches accounts on a
// paid self-service plan (basic/starter) with a planExpiresAt set — free and
// enterprise never expire through this path.
export async function runPlanExpiryCheck(): Promise<void> {
  await connectDB();
  const now = new Date();

  // Expired: downgrade to free and notify. Matched and updated per-document
  // (not a single updateMany) so each user gets exactly one SMS with their
  // own plan name, and so a crash mid-run just leaves the rest for next tick
  // instead of silently skipping notifications for a batch.
  const expired = await User.find({
    plan: { $in: ["basic", "starter"] },
    planExpiresAt: { $lte: now },
  }).select("_id phone plan").lean();

  for (const user of expired) {
    const previousPlan = user.plan;
    await User.updateOne(
      { _id: user._id, planExpiresAt: { $lte: now } }, // re-checked: avoids a double-fire if a renewal lands between the find and here
      { $set: { plan: "free", planMaxUsers: null, planClientsPerUser: null, planExpiresAt: null, planReminderSentAt: null } }
    );
    if (user.phone) {
      sendPlanExpiredSms(user.phone, previousPlan, newClientSmsId("planexpired")).catch(console.error);
    }
  }

  // Expiring soon: remind once per subscription period (planReminderSentAt
  // gets cleared on every renewal/change, so a fresh cycle can remind again).
  const reminderWindowEnd = new Date(now.getTime() + PLAN_REMINDER_DAYS_BEFORE * 24 * 60 * 60 * 1000);
  const expiringSoon = await User.find({
    plan: { $in: ["basic", "starter"] },
    planExpiresAt: { $gt: now, $lte: reminderWindowEnd },
    planReminderSentAt: null,
  }).select("_id phone plan planExpiresAt").lean();

  for (const user of expiringSoon) {
    if (!user.planExpiresAt) continue;
    const daysLeft = Math.max(1, Math.ceil((user.planExpiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
    const updated = await User.updateOne(
      { _id: user._id, planReminderSentAt: null },
      { $set: { planReminderSentAt: now } }
    );
    if (updated.modifiedCount === 0) continue; // already reminded by a concurrent tick
    if (user.phone) {
      sendPlanExpiringSoonSms(user.phone, user.plan, daysLeft, newClientSmsId("planexpiring")).catch(console.error);
    }
  }
}
