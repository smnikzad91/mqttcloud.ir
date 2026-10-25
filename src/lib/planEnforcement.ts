import User from "@/models/User";
import { resolvePlanLimits, PLAN_DEFS, type PlanKey } from "@/lib/plans";

export class PlanLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlanLimitError";
  }
}

// Called before creating a new MqttUser ("sub-user" credential set).
// `excludeId` lets an update path (if one is ever added) recount without
// double-counting the document being saved.
export async function assertCanCreateMqttUser(userId: string, currentCount: number): Promise<void> {
  const user = await User.findById(userId).select("plan planMaxUsers planClientsPerUser").lean();
  if (!user) throw new PlanLimitError("User not found.");

  const { maxUsers } = resolvePlanLimits(user);
  if (currentCount >= maxUsers) {
    throw new PlanLimitError(
      `Your plan allows up to ${maxUsers} MQTT credential set(s). Upgrade your plan to create more.`
    );
  }
}

// Called before creating a new MqttClient under a given MqttUser credential.
export async function assertCanCreateMqttClient(userId: string, currentCount: number): Promise<void> {
  const user = await User.findById(userId).select("plan planMaxUsers planClientsPerUser").lean();
  if (!user) throw new PlanLimitError("User not found.");

  const { clientsPerUser } = resolvePlanLimits(user);
  if (currentCount >= clientsPerUser) {
    throw new PlanLimitError(
      `Your plan allows up to ${clientsPerUser} client(s) per credential. Upgrade your plan to add more.`
    );
  }
}

// Shared by the free-plan instant switch (PATCH /api/user/plan), the paid
// checkout flow (POST /api/user/plan/checkout), and the webhook that applies
// a paid plan once nodepass confirms payment — all three need to confirm the
// account's current usage actually fits the target plan. Deliberately a pure
// function (no DB access, no MqttUser/MqttClient import): those models'
// pre-save hooks import this file, so querying them back from here would be
// a circular import. Callers already have (or can cheaply get) these counts.
export function assertUsageFitsPlan(targetPlan: PlanKey, mqttUserCount: number, clientCountsPerCredential: number[]): void {
  const targetLimits = PLAN_DEFS[targetPlan];

  if (targetLimits.maxUsers !== null && mqttUserCount > targetLimits.maxUsers) {
    throw new PlanLimitError(
      `You currently have ${mqttUserCount} MQTT credential set(s), which is more than this plan's limit of ${targetLimits.maxUsers}. Remove some before switching.`
    );
  }

  if (targetLimits.clientsPerUser !== null && clientCountsPerCredential.some((count) => count > targetLimits.clientsPerUser!)) {
    throw new PlanLimitError(
      `One or more of your credentials has more clients than this plan's limit of ${targetLimits.clientsPerUser}. Remove some before switching.`
    );
  }
}
