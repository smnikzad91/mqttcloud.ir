import type { NodepassPayment } from "@/lib/nodepass";
import Deposit from "@/models/Deposit";
import PlanPurchase from "@/models/PlanPurchase";
import User from "@/models/User";
import MqttUser from "@/models/MqttUser";
import MqttClient from "@/models/MqttClient";
import { sendDepositStatusEmail } from "@/lib/mailer";
import { assertUsageFitsPlan, PlanLimitError } from "@/lib/planEnforcement";

// nodepass can redeliver the same event, and (per its own docs) a payment
// can go PENDING -> EXPIRED -> PAID if the bank SMS lands just after expiry.
// Every write below is a single atomic findOneAndUpdate guarded by the
// current status, so the wallet credit / plan change only ever happens once
// no matter how many times or in what order the webhook fires.
export async function handleDepositWebhook(deposit: InstanceType<typeof Deposit>, event: string, payment: NodepassPayment) {
  if (event === "payment.paid") {
    const updated = await Deposit.findOneAndUpdate(
      { _id: deposit._id, status: { $ne: "approved" } },
      { $set: { status: "approved", adminNote: "پرداخت خودکار از طریق nodepass.ir", payableRial: payment.payableRial ?? deposit.payableRial } }
    );
    if (!updated) return; // already credited by an earlier delivery

    await User.findByIdAndUpdate(deposit.userId, { $inc: { walletBalance: deposit.amount } });

    const user = await User.findById(deposit.userId).select("email firstName").lean();
    if (user?.email) {
      sendDepositStatusEmail({
        to: user.email,
        firstName: user.firstName,
        amount: deposit.amount,
        status: "approved",
        interceptionCode: deposit.interceptionCode,
      }).catch(console.error);
    }
  } else if (event === "payment.expired" || event === "payment.cancelled") {
    await Deposit.findOneAndUpdate(
      { _id: deposit._id, status: "pending" },
      { $set: { status: "rejected", adminNote: event === "payment.expired" ? "پرداخت در زمان مقرر انجام نشد" : "پرداخت توسط کاربر لغو شد" } }
    );
  }
}

export async function handlePlanPurchaseWebhook(purchase: InstanceType<typeof PlanPurchase>, event: string) {
  if (event === "payment.paid") {
    const updated = await PlanPurchase.findOneAndUpdate(
      { _id: purchase._id, status: { $ne: "paid" } },
      { $set: { status: "paid", paidAt: new Date() } }
    );
    if (!updated) return; // already applied by an earlier delivery

    const mqttUserCount = await MqttUser.countDocuments({ userId: purchase.userId });
    const credentials = await MqttUser.find({ userId: purchase.userId }).select("_id").lean();
    const clientCounts = await Promise.all(credentials.map((c) => MqttClient.countDocuments({ mqttUserId: c._id })));

    try {
      assertUsageFitsPlan(purchase.targetPlan, mqttUserCount, clientCounts);
    } catch (err) {
      // Should never happen for an upgrade (usage already fit the lower
      // current plan). Keep the payment marked paid either way — money was
      // received — but surface this loudly for manual follow-up.
      console.error(`[nodepass webhook] plan purchase ${purchase._id} paid but usage no longer fits ${purchase.targetPlan}:`, err instanceof PlanLimitError ? err.message : err);
      return;
    }

    await User.findByIdAndUpdate(purchase.userId, {
      $set: { plan: purchase.targetPlan, planMaxUsers: null, planClientsPerUser: null },
    });
  } else if (event === "payment.expired" || event === "payment.cancelled") {
    await PlanPurchase.findOneAndUpdate(
      { _id: purchase._id, status: "pending" },
      { $set: { status: event === "payment.expired" ? "expired" : "cancelled" } }
    );
  }
}
