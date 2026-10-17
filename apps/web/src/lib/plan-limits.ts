export type PlanLimits = {
  emailsPerMonth: number;
  emailsPerDay: number;
  domains: number;
  contactBooks: number;
  teamMembers: number;
  webhooks: number;
};

export type PlanLimitSource = {
  emailQuota: number;
  emailsPerDay: number;
  domainLimit: number;
  teamMemberLimit: number;
  contactBookLimit: number;
  webhookLimit: number;
  isDefault?: boolean;
};

export type LegacyPlanName = "FREE" | "BASIC";

export function limitsFromPlan(plan: PlanLimitSource): PlanLimits {
  return {
    emailsPerMonth: plan.emailQuota,
    emailsPerDay: plan.emailsPerDay,
    domains: plan.domainLimit,
    contactBooks: plan.contactBookLimit,
    teamMembers: plan.teamMemberLimit,
    webhooks: plan.webhookLimit,
  };
}

/**
 * Picks the limits that apply to a team. The team's BillingPlan wins; the default plan
 * is used when the team is inactive or has no plan, and the hard-coded fallback only
 * applies when the database has no default plan at all.
 */
export function resolvePlanLimits(input: {
  isActive: boolean;
  legacyPlan: LegacyPlanName;
  teamPlan: PlanLimitSource | null | undefined;
  defaultPlan: PlanLimitSource | null | undefined;
  fallback: Record<LegacyPlanName, PlanLimits>;
}): PlanLimits {
  const { isActive, legacyPlan, teamPlan, defaultPlan, fallback } = input;

  const onDefaultPlan = !teamPlan || teamPlan.isDefault === true;

  // An admin can still grant the legacy BASIC (unlimited) plan from /admin/teams.
  if (isActive && legacyPlan === "BASIC" && onDefaultPlan) {
    return fallback.BASIC;
  }

  if (isActive && teamPlan) {
    return limitsFromPlan(teamPlan);
  }

  if (defaultPlan) {
    return limitsFromPlan(defaultPlan);
  }

  return fallback.FREE;
}
