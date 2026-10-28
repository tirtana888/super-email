import { describe, expect, it } from "vitest";
import {
  countChange,
  metricPeriods,
  metricRates,
  rateChange,
  summarizeMetrics,
} from "./metrics-summary";

const today = new Date("2026-10-28T15:00:00.000Z");
const row = (date: string, domainId: number, sent: number, extra: Partial<Record<string, number>> = {}) => ({
  date,
  domainId,
  sent,
  delivered: extra.delivered ?? sent,
  opened: extra.opened ?? 0,
  clicked: extra.clicked ?? 0,
  bounced: extra.bounced ?? 0,
  complained: extra.complained ?? 0,
});

describe("metricPeriods", () => {
  it("covers exactly N days ending today, and the N days before", () => {
    expect(metricPeriods(7, today)).toEqual({
      start: "2026-10-22",
      end: "2026-10-28",
      previousStart: "2026-10-15",
      previousEnd: "2026-10-21",
    });
  });

  it("crosses month boundaries", () => {
    expect(metricPeriods(30, today)).toEqual({
      start: "2026-09-29",
      end: "2026-10-28",
      previousStart: "2026-08-30",
      previousEnd: "2026-09-28",
    });
  });
});

describe("summarizeMetrics", () => {
  const rows = [
    row("2026-10-28", 1, 100, { delivered: 98, bounced: 2, opened: 40, clicked: 5 }),
    row("2026-10-28", 2, 50, { delivered: 50, complained: 1, opened: 10 }),
    row("2026-10-25", 1, 200, { delivered: 196, bounced: 4, opened: 80, clicked: 9 }),
    row("2026-10-21", 1, 120, { delivered: 120, opened: 30 }), // previous period
    row("2026-10-15", 2, 30, { delivered: 29, bounced: 1 }), // previous period, first day
    row("2026-10-14", 1, 999), // outside both periods
  ];
  const s = summarizeMetrics(rows, { days: 7, today });

  it("totals the selected and the previous period separately", () => {
    expect(s.current).toEqual({ sent: 350, delivered: 344, opened: 130, clicked: 14, bounced: 6, complained: 1 });
    expect(s.previous).toEqual({ sent: 150, delivered: 149, opened: 30, clicked: 0, bounced: 1, complained: 0 });
  });

  it("returns one zero-filled point per day, oldest first", () => {
    expect(s.series).toHaveLength(7);
    expect(s.series[0]!.date).toBe("2026-10-22");
    expect(s.series[6]).toEqual({ date: "2026-10-28", sent: 150, delivered: 148, opened: 50, clicked: 5, bounced: 2, complained: 1 });
    expect(s.series[3]!.sent).toBe(200);
    expect(s.series[1]!.sent).toBe(0);
  });

  it("breaks the selected period down per domain, busiest first", () => {
    expect(s.byDomain.map((d) => [d.domainId, d.sent, d.bounced])).toEqual([
      [1, 300, 6],
      [2, 50, 0],
    ]);
    expect(s.byDomain[1]!.rates.complaintRate).toBe(0.02);
  });
});

describe("rates and changes", () => {
  it("uses sent for delivery, bounce and complaint, delivered for opens and clicks", () => {
    expect(metricRates({ sent: 200, delivered: 190, bounced: 10, complained: 1, opened: 95, clicked: 19 })).toEqual({
      deliveredRate: 0.95,
      bounceRate: 0.05,
      complaintRate: 0.005,
      openRate: 0.5,
      clickRate: 0.1,
    });
  });

  it("returns null instead of dividing by zero", () => {
    expect(metricRates({ sent: 0, delivered: 0, bounced: 0, complained: 0, opened: 0, clicked: 0 }).bounceRate).toBeNull();
    expect(countChange(10, 0)).toBeNull();
    expect(rateChange(0.01, null)).toBeNull();
  });

  it("computes relative change for counts and point change for rates", () => {
    expect(Math.round(countChange(350, 150)! * 10000) / 10000).toBe(1.3333);
    expect(Math.round(rateChange(0.0171, 0.0067)! * 10000) / 10000).toBe(0.0104);
  });
});
