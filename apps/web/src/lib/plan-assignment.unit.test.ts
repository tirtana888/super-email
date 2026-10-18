import { describe, expect, it } from "vitest";
import {
  endOfDayJakarta,
  manualSubscriptionId,
  planAssignment,
} from "./plan-assignment";

const now = new Date("2026-10-18T12:00:00.000Z");
const free = { id: "plan_free", name: "Free", isDefault: true };
const pro = { id: "plan_pro", name: "Pro", isDefault: false };

describe("planAssignment", () => {
  it("grants a catalog plan permanently when there is no end date", () => {
    const result = planAssignment({
      target: { kind: "catalog", plan: pro },
      defaultPlanId: free.id,
      endsAt: null,
      now,
    });

    expect(result.team).toEqual({ billingPlanId: "plan_pro", plan: "BASIC" });
    expect(result.subscription).toEqual({
      priceId: "plan_pro",
      currentPeriodStart: now,
      currentPeriodEnd: null,
    });
    expect(result.cancelActiveSubscriptions).toBe(false);
    expect(result.endsAt).toBeNull();
    expect(result.label).toBe("Pro");
  });

  it("grants a catalog plan until the given date", () => {
    const endsAt = new Date("2026-11-18T16:59:59.000Z");
    const result = planAssignment({
      target: { kind: "catalog", plan: pro },
      defaultPlanId: free.id,
      endsAt,
      now,
    });

    expect(result.subscription?.currentPeriodEnd).toEqual(endsAt);
    expect(result.endsAt).toEqual(endsAt);
  });

  it("rejects an end date that is not in the future", () => {
    expect(() =>
      planAssignment({
        target: { kind: "catalog", plan: pro },
        defaultPlanId: free.id,
        endsAt: new Date("2026-10-17T00:00:00.000Z"),
        now,
      }),
    ).toThrow("future");
    expect(() =>
      planAssignment({
        target: { kind: "catalog", plan: pro },
        defaultPlanId: free.id,
        endsAt: now,
        now,
      }),
    ).toThrow("future");
  });

  it("puts the team back on the default plan, closes active subscriptions and ignores any date", () => {
    const result = planAssignment({
      target: { kind: "catalog", plan: free },
      defaultPlanId: free.id,
      endsAt: new Date("2030-01-01T00:00:00.000Z"),
      now,
    });

    expect(result.team).toEqual({ billingPlanId: "plan_free", plan: "FREE" });
    expect(result.subscription).toBeNull();
    expect(result.cancelActiveSubscriptions).toBe(true);
    expect(result.endsAt).toBeNull();
  });

  it("grants the legacy unlimited plan on top of the default plan", () => {
    const result = planAssignment({
      target: { kind: "legacy-unlimited" },
      defaultPlanId: free.id,
      endsAt: null,
      now,
    });

    expect(result.team).toEqual({ billingPlanId: "plan_free", plan: "BASIC" });
    expect(result.subscription).toBeNull();
    expect(result.cancelActiveSubscriptions).toBe(true);
    expect(result.label).toBe("Unlimited (legacy)");
  });
});

describe("manualSubscriptionId", () => {
  it("is recognisable and unique per team and moment", () => {
    expect(manualSubscriptionId(4, now)).toBe(`admin_4_${now.getTime()}`);
    expect(manualSubscriptionId(4, now)).not.toBe(
      manualSubscriptionId(5, now),
    );
  });
});

describe("endOfDayJakarta", () => {
  it("lasts until the last second of that day in Jakarta", () => {
    expect(endOfDayJakarta("2026-11-18")?.toISOString()).toBe(
      "2026-11-18T16:59:59.000Z",
    );
  });

  it("returns null for anything that is not a calendar day", () => {
    expect(endOfDayJakarta("")).toBeNull();
    expect(endOfDayJakarta("18/11/2026")).toBeNull();
    expect(endOfDayJakarta("2026-13-45")).toBeNull();
  });
});
