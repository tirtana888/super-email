export const GRACE_PERIOD_DAYS = 3;
export const EXPIRY_REMINDER_DAYS = 3;
export const DAYS_PER_BILLING_MONTH = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

export type PeriodState = "active" | "grace" | "expired";
export type ReminderKind = "expiring" | "grace" | "downgraded";

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

export function getGraceEnd(
  periodEnd: Date,
  graceDays: number = GRACE_PERIOD_DAYS,
): Date {
  return addDays(periodEnd, graceDays);
}

/**
 * A paid plan stays fully active until its period ends, keeps working for the
 * grace period after that, and only then falls back to the default plan.
 */
export function getPeriodState(
  periodEnd: Date,
  now: Date,
  graceDays: number = GRACE_PERIOD_DAYS,
): PeriodState {
  if (now.getTime() <= periodEnd.getTime()) {
    return "active";
  }

  if (now.getTime() <= getGraceEnd(periodEnd, graceDays).getTime()) {
    return "grace";
  }

  return "expired";
}

/** Whole days left until the date, rounded up. Zero or negative once it has passed. */
export function daysUntil(date: Date, now: Date): number {
  return Math.ceil((date.getTime() - now.getTime()) / DAY_MS);
}

/**
 * Paying again for the same plan while it is still running adds the new period
 * on top of the remaining time instead of throwing the remaining days away.
 */
export function calculateRenewalPeriod(input: {
  now: Date;
  intervalMonths: number;
  /** End of the current period, only when it belongs to the plan being paid for. */
  currentPeriodEnd?: Date | null;
}): { start: Date; end: Date } {
  const { now, intervalMonths, currentPeriodEnd } = input;
  const base =
    currentPeriodEnd && currentPeriodEnd.getTime() > now.getTime()
      ? currentPeriodEnd
      : now;

  return {
    start: now,
    end: addDays(base, intervalMonths * DAYS_PER_BILLING_MONTH),
  };
}

/** Which notification a team should get right now, if any. */
export function getReminderKind(
  periodEnd: Date,
  now: Date,
  graceDays: number = GRACE_PERIOD_DAYS,
): ReminderKind | null {
  const state = getPeriodState(periodEnd, now, graceDays);

  if (state === "expired") {
    return "downgraded";
  }

  if (state === "grace") {
    return "grace";
  }

  return daysUntil(periodEnd, now) <= EXPIRY_REMINDER_DAYS ? "expiring" : null;
}
