export type AssignmentTarget =
  | { kind: "catalog"; plan: { id: string; name: string; isDefault: boolean } }
  | { kind: "legacy-unlimited" };

export type PlanAssignment = {
  /** Fields written to the team. The legacy `plan` is kept in sync like a paid checkout does. */
  team: { billingPlanId: string; plan: "FREE" | "BASIC" };
  /** A manual subscription row, or null when nothing should be granted. */
  subscription: {
    priceId: string;
    currentPeriodStart: Date;
    /** null means the grant never expires on its own. */
    currentPeriodEnd: Date | null;
  } | null;
  /** Active subscriptions are closed when the team goes back to a plan without a period. */
  cancelActiveSubscriptions: boolean;
  label: string;
  endsAt: Date | null;
};

export const MANUAL_PAYMENT_METHOD = "ADMIN";

/**
 * Decides what an admin plan change writes to the database. Kept free of database access so the
 * rules can be tested on their own.
 */
export function planAssignment(input: {
  target: AssignmentTarget;
  defaultPlanId: string;
  endsAt: Date | null;
  now: Date;
}): PlanAssignment {
  const { target, defaultPlanId, endsAt, now } = input;

  if (target.kind === "legacy-unlimited") {
    return {
      team: { billingPlanId: defaultPlanId, plan: "BASIC" },
      subscription: null,
      cancelActiveSubscriptions: true,
      label: "Unlimited (legacy)",
      endsAt: null,
    };
  }

  if (target.plan.isDefault) {
    return {
      team: { billingPlanId: target.plan.id, plan: "FREE" },
      subscription: null,
      cancelActiveSubscriptions: true,
      label: target.plan.name,
      endsAt: null,
    };
  }

  if (endsAt && endsAt.getTime() <= now.getTime()) {
    throw new Error("The end date must be in the future.");
  }

  return {
    team: { billingPlanId: target.plan.id, plan: "BASIC" },
    subscription: {
      priceId: target.plan.id,
      currentPeriodStart: now,
      currentPeriodEnd: endsAt,
    },
    cancelActiveSubscriptions: false,
    label: target.plan.name,
    endsAt,
  };
}

export function manualSubscriptionId(teamId: number, now: Date) {
  return `admin_${teamId}_${now.getTime()}`;
}

/** The date picker gives a calendar day; the grant lasts until the end of that day in Jakarta. */
export function endOfDayJakarta(day: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    return null;
  }

  const date = new Date(`${day}T23:59:59+07:00`);

  return Number.isNaN(date.getTime()) ? null : date;
}
