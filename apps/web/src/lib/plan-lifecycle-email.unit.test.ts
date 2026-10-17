import { describe, expect, it } from "vitest";
import { addDays } from "./plan-lifecycle";
import { buildPlanLifecycleEmail } from "./plan-lifecycle-email";

const periodEnd = new Date("2026-11-01T00:00:00.000Z");
const input = {
  teamName: "Toko Kita",
  planName: "Starter",
  periodEnd,
  billingUrl: "https://app.f14.dev/settings/billing",
};

describe("buildPlanLifecycleEmail", () => {
  it("warns how many days are left and links to billing", () => {
    const { subject, text } = buildPlanLifecycleEmail("expiring", {
      ...input,
      now: addDays(periodEnd, -2),
    });

    expect(subject).toContain("Starter");
    expect(subject).toContain("2 hari");
    expect(text).toContain("Toko Kita");
    expect(text).toContain("https://app.f14.dev/settings/billing");
    expect(text).toContain("masa tenggang 3 hari");
  });

  it("never says zero days for an expiring plan", () => {
    const { subject } = buildPlanLifecycleEmail("expiring", {
      ...input,
      now: addDays(periodEnd, -0.1),
    });

    expect(subject).toContain("1 hari");
  });

  it("explains that sending continues during the grace period", () => {
    const { subject, text } = buildPlanLifecycleEmail("grace", {
      ...input,
      now: addDays(periodEnd, 1),
    });

    expect(subject).toContain("masa tenggang");
    expect(text).toContain("kembali ke paket Free");
    expect(text).toContain("https://app.f14.dev/settings/billing");
  });

  it("tells the team it moved to Free without deleting anything", () => {
    const { subject, text } = buildPlanLifecycleEmail("downgraded", {
      ...input,
      now: addDays(periodEnd, 5),
    });

    expect(subject).toContain("paket Free");
    expect(text).toContain("tidak dihapus");
  });
});
