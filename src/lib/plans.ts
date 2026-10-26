// Subscription tiers. `maxUsers` caps how many MqttUser credential sets
// ("sub-users") an account may create; `clientsPerUser` caps how many
// MqttClient devices may be registered under each of those credential sets.
// Enterprise has no built-in numbers — it's sales-negotiated and only takes
// effect once an admin sets User.planMaxUsers/planClientsPerUser.
export type PlanKey = "free" | "basic" | "starter" | "enterprise";

export interface PlanDef {
  key: PlanKey;
  nameFa: string;
  maxUsers: number | null;      // null = custom/unset, resolved via admin override
  clientsPerUser: number | null;
  selfService: boolean;         // can a user switch to this plan themselves?
  priceToman: number | null;    // null = no fixed price (enterprise — contact sales)
}

export const PLAN_DEFS: Record<PlanKey, PlanDef> = {
  free: {
    key: "free",
    nameFa: "پلن رایگان",
    maxUsers: 1,
    clientsPerUser: 2,
    selfService: true,
    priceToman: 0,
  },
  basic: {
    key: "basic",
    nameFa: "پلن پایه",
    maxUsers: 3,
    clientsPerUser: 3,
    selfService: true,
    priceToman: 499000,
  },
  starter: {
    key: "starter",
    nameFa: "پلن استارتر",
    maxUsers: 5,
    clientsPerUser: 5,
    selfService: true,
    priceToman: 999000,
  },
  enterprise: {
    key: "enterprise",
    nameFa: "پلن پیشرفته",
    maxUsers: null,
    clientsPerUser: null,
    selfService: false,
    priceToman: null,
  },
};

export const SELF_SERVICE_PLANS: PlanKey[] = (Object.keys(PLAN_DEFS) as PlanKey[]).filter(
  (k) => PLAN_DEFS[k].selfService
);

// How long a paid self-service plan lasts before it needs renewing. Applies
// to basic/starter only — free has no cost to expire, and enterprise is
// admin-managed (see User.planExpiresAt / src/lib/planExpiry.ts).
export const PLAN_SUBSCRIPTION_DAYS = 30;
export const PLAN_REMINDER_DAYS_BEFORE = 3;

// Self-service plans that actually cost something — these must go through
// nodepass checkout rather than the instant free PATCH /api/user/plan.
export const PAID_SELF_SERVICE_PLANS: PlanKey[] = SELF_SERVICE_PLANS.filter(
  (k) => (PLAN_DEFS[k].priceToman ?? 0) > 0
);

export interface ResolvedLimits {
  maxUsers: number;
  clientsPerUser: number;
}

// A user with no numeric limit resolved (e.g. enterprise before an admin
// configures it) gets 0 — fail closed, never silently unlimited.
export function resolvePlanLimits(user: { plan?: string; planMaxUsers?: number | null; planClientsPerUser?: number | null }): ResolvedLimits {
  const def = PLAN_DEFS[(user.plan as PlanKey) ?? "free"] ?? PLAN_DEFS.free;
  return {
    maxUsers: user.planMaxUsers ?? def.maxUsers ?? 0,
    clientsPerUser: user.planClientsPerUser ?? def.clientsPerUser ?? 0,
  };
}
