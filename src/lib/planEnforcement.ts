import User from "@/models/User";
import { resolvePlanLimits } from "@/lib/plans";

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
