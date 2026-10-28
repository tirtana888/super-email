import { describe, expect, it } from "vitest";
import {
  formatDashboardTime,
  formatDashboardTimeLong,
  formatElapsed,
} from "./format-time";

const now = new Date("2026-10-28T05:00:00.000Z");

describe("formatDashboardTime", () => {
  it("shows Jakarta time (UTC+7) with seconds and no year for this year", () => {
    expect(formatDashboardTime("2026-10-28T03:42:07.000Z", { now })).toBe(
      "28 Oct 10:42:07",
    );
  });

  it("rolls the date over when UTC is still the previous day", () => {
    expect(formatDashboardTime("2026-10-27T18:30:00.000Z", { now })).toBe(
      "28 Oct 01:30:00",
    );
  });

  it("adds the year for other years", () => {
    expect(formatDashboardTime("2025-12-31T23:59:59.000Z", { now })).toBe(
      "01 Jan 06:59:59",
    );
    expect(formatDashboardTime("2025-06-01T00:00:00.000Z", { now })).toBe(
      "01 Jun 2025 07:00:00",
    );
  });

  it("can drop seconds and ignores invalid input", () => {
    expect(
      formatDashboardTime("2026-10-28T03:42:07.000Z", { now, seconds: false }),
    ).toBe("28 Oct 10:42");
    expect(formatDashboardTime("not a date", { now })).toBe("");
  });
});

describe("formatDashboardTimeLong", () => {
  it("includes the year and the WIB label", () => {
    expect(formatDashboardTimeLong("2026-10-28T03:42:07.000Z")).toBe(
      "28 Oct 2026, 10:42:07 WIB",
    );
  });
});

describe("formatElapsed", () => {
  const t0 = "2026-10-28T03:39:51.204Z";
  it("uses one decimal under ten seconds", () => {
    expect(formatElapsed(t0, "2026-10-28T03:39:52.004Z")).toBe("+0.8s");
  });
  it("uses minutes and hours for longer gaps", () => {
    expect(formatElapsed(t0, "2026-10-28T03:40:21.204Z")).toBe("+30s");
    expect(formatElapsed(t0, "2026-10-28T03:42:56.204Z")).toBe("+3m 05s");
    expect(formatElapsed(t0, "2026-10-28T05:49:51.204Z")).toBe("+2h 10m");
    expect(formatElapsed(t0, "2026-10-31T05:39:51.204Z")).toBe("+3d 2h");
  });
  it("returns nothing for reversed or invalid input", () => {
    expect(formatElapsed("2026-10-28T03:40:00Z", t0)).toBe("");
    expect(formatElapsed("x", t0)).toBe("");
  });
});
