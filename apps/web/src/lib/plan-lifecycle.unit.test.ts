import { describe, expect, it } from "vitest";
import {
  addDays,
  calculateRenewalPeriod,
  daysUntil,
  getGraceEnd,
  getPeriodState,
  getReminderKind,
} from "./plan-lifecycle";

const end = new Date("2026-11-01T00:00:00.000Z");

describe("getPeriodState", () => {
  it("is active up to and including the period end", () => {
    expect(getPeriodState(end, addDays(end, -10))).toBe("active");
    expect(getPeriodState(end, end)).toBe("active");
  });

  it("is in grace for 3 days after the period end", () => {
    expect(getPeriodState(end, addDays(end, 0.01))).toBe("grace");
    expect(getPeriodState(end, getGraceEnd(end))).toBe("grace");
  });

  it("is expired after the grace period", () => {
    expect(getPeriodState(end, new Date(getGraceEnd(end).getTime() + 1))).toBe(
      "expired",
    );
  });

  it("honours a custom grace length", () => {
    expect(getPeriodState(end, addDays(end, 2), 1)).toBe("expired");
  });
});

describe("daysUntil", () => {
  it("rounds partial days up", () => {
    expect(daysUntil(end, addDays(end, -2.4))).toBe(3);
    expect(daysUntil(end, addDays(end, -1))).toBe(1);
  });

  it("is zero or negative once the date has passed", () => {
    expect(daysUntil(end, end)).toBe(0);
    expect(daysUntil(end, addDays(end, 2))).toBeLessThanOrEqual(0);
  });
});

describe("calculateRenewalPeriod", () => {
  const now = new Date("2026-10-20T00:00:00.000Z");

  it("starts a fresh 30-day period when there is no current period", () => {
    const period = calculateRenewalPeriod({ now, intervalMonths: 1 });

    expect(period.start).toEqual(now);
    expect(period.end).toEqual(addDays(now, 30));
  });

  it("multiplies the interval by 30 days", () => {
    const period = calculateRenewalPeriod({ now, intervalMonths: 3 });

    expect(period.end).toEqual(addDays(now, 90));
  });

  it("adds the new period after the remaining time of a running period", () => {
    const running = addDays(now, 5);
    const period = calculateRenewalPeriod({
      now,
      intervalMonths: 1,
      currentPeriodEnd: running,
    });

    expect(period.start).toEqual(now);
    expect(period.end).toEqual(addDays(running, 30));
  });

  it("does not carry over time from a period that already ended", () => {
    const period = calculateRenewalPeriod({
      now,
      intervalMonths: 1,
      currentPeriodEnd: addDays(now, -2),
    });

    expect(period.end).toEqual(addDays(now, 30));
  });
});

describe("getReminderKind", () => {
  it("stays quiet while there is plenty of time left", () => {
    expect(getReminderKind(end, addDays(end, -10))).toBeNull();
  });

  it("warns during the last 3 days", () => {
    expect(getReminderKind(end, addDays(end, -3))).toBe("expiring");
    expect(getReminderKind(end, addDays(end, -0.5))).toBe("expiring");
  });

  it("flags the grace period and then the downgrade", () => {
    expect(getReminderKind(end, addDays(end, 1))).toBe("grace");
    expect(getReminderKind(end, addDays(end, 4))).toBe("downgraded");
  });
});
