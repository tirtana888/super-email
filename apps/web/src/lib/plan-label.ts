export type TeamPlanSource = {
  plan: "FREE" | "BASIC";
  billingPlan: { name: string; isDefault: boolean } | null;
};

/**
 * Mirrors how limits are resolved: a catalog plan that is not the default wins, and the legacy
 * BASIC flag only counts while the team is on the default plan.
 */
export function describeTeamPlan(team: TeamPlanSource): {
  label: string;
  paid: boolean;
} {
  if (team.billingPlan && !team.billingPlan.isDefault) {
    return { label: team.billingPlan.name, paid: true };
  }

  if (team.plan === "BASIC") {
    return { label: "Unlimited (legacy)", paid: true };
  }

  return { label: team.billingPlan?.name ?? "Free", paid: false };
}
