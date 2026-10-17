import { describe, expect, it } from "vitest";
import {
  limitsFromPlan,
  resolvePlanLimits,
  type PlanLimitSource,
  type PlanLimits,
} from "./plan-limits";

const FALLBACK: Record<"FREE" | "BASIC", PlanLimits> = {
  FREE: {
    emailsPerMonth: 3000,
    emailsPerDay: 100,
    domains: 1,
    contactBooks: 1,
    teamMembers: 1,
    webhooks: 1,
  },
  BASIC: {
    emailsPerMonth: -1,
    emailsPerDay: -1,
    domains: -1,
    contactBooks: -1,
    teamMembers: -1,
    webhooks: -1,
  },
};

const freePlan: PlanLimitSource = {
  emailQuota: 2000,
  emailsPerDay: 50,
  domainLimit: 2,
  teamMemberLimit: 2,
  contactBookLimit: 2,
  webhookLimit: 2,
  isDefault: true,
};

const paidPlan: PlanLimitSource = {
  emailQuota: 50000,
  emailsPerDay: 2000,
  domainLimit: 10,
  teamMemberLimit: 5,
  contactBookLimit: -1,
  webhookLimit: 5,
  isDefault: false,
};

describe("limitsFromPlan", () => {
  it("maps plan columns to limits", () => {
    expect(limitsFromPlan(paidPlan)).toEqual({
      emailsPerMonth: 50000,
      emailsPerDay: 2000,
      domains: 10,
      contactBooks: -1,
      teamMembers: 5,
      webhooks: 5,
    });
  });
});

describe("resolvePlanLimits", () => {
  const base = { fallback: FALLBACK, defaultPlan: freePlan };

  it("uses the team's own plan, not the hard-coded Free limits", () => {
    const limits = resolvePlanLimits({
      ...base,
      isActive: true,
      legacyPlan: "FREE",
      teamPlan: paidPlan,
    });

    expect(limits).toEqual(limitsFromPlan(paidPlan));
  });

  it("reads Free limits from the default plan row so admin edits apply", () => {
    const limits = resolvePlanLimits({
      ...base,
      isActive: true,
      legacyPlan: "FREE",
      teamPlan: freePlan,
    });

    expect(limits.emailsPerMonth).toBe(2000);
    expect(limits.emailsPerDay).toBe(50);
  });

  it("falls back to the default plan when the team has no plan", () => {
    const limits = resolvePlanLimits({
      ...base,
      isActive: true,
      legacyPlan: "FREE",
      teamPlan: null,
    });

    expect(limits).toEqual(limitsFromPlan(freePlan));
  });

  it("drops an inactive team back to the default plan", () => {
    const limits = resolvePlanLimits({
      ...base,
      isActive: false,
      legacyPlan: "FREE",
      teamPlan: paidPlan,
    });

    expect(limits).toEqual(limitsFromPlan(freePlan));
  });

  it("keeps the admin-granted legacy BASIC plan unlimited on the default plan", () => {
    const limits = resolvePlanLimits({
      ...base,
      isActive: true,
      legacyPlan: "BASIC",
      teamPlan: freePlan,
    });

    expect(limits).toEqual(FALLBACK.BASIC);
  });

  it("lets a purchased plan win over a leftover legacy BASIC flag", () => {
    const limits = resolvePlanLimits({
      ...base,
      isActive: true,
      legacyPlan: "BASIC",
      teamPlan: paidPlan,
    });

    expect(limits).toEqual(limitsFromPlan(paidPlan));
  });

  it("uses the hard-coded Free limits only when no default plan exists", () => {
    const limits = resolvePlanLimits({
      fallback: FALLBACK,
      defaultPlan: null,
      isActive: true,
      legacyPlan: "FREE",
      teamPlan: null,
    });

    expect(limits).toEqual(FALLBACK.FREE);
  });
});
