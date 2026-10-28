export const METRIC_PERIODS = [7, 30, 90] as const;
export type MetricPeriod = (typeof METRIC_PERIODS)[number];

export type MetricTotals = {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  complained: number;
};

export type DailyMetricRow = MetricTotals & {
  date: string; // YYYY-MM-DD, as stored in DailyEmailUsage
  domainId: number;
};

export type MetricRates = {
  /** delivered / sent */
  deliveredRate: number | null;
  /** bounced / sent */
  bounceRate: number | null;
  /** complained / sent */
  complaintRate: number | null;
  /** opened / delivered */
  openRate: number | null;
  /** clicked / delivered */
  clickRate: number | null;
};

const ZERO: MetricTotals = {
  sent: 0,
  delivered: 0,
  opened: 0,
  clicked: 0,
  bounced: 0,
  complained: 0,
};

const KEYS = Object.keys(ZERO) as Array<keyof MetricTotals>;

/** The UTC calendar day, matching how DailyEmailUsage dates are written. */
export function isoDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(day: string, n: number) {
  const d = new Date(`${day}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return isoDay(d);
}

/**
 * The selected period is the last `days` days including today; the previous
 * period is the same number of days right before it.
 */
export function metricPeriods(days: number, today: Date = new Date()) {
  const end = isoDay(today);
  const start = addDays(end, -(days - 1));
  const previousEnd = addDays(start, -1);
  const previousStart = addDays(previousEnd, -(days - 1));
  return { start, end, previousStart, previousEnd };
}

function add(into: MetricTotals, row: MetricTotals) {
  for (const key of KEYS) into[key] += Number(row[key]) || 0;
}

const ratio = (part: number, whole: number) => (whole > 0 ? part / whole : null);

export function metricRates(t: MetricTotals): MetricRates {
  return {
    deliveredRate: ratio(t.delivered, t.sent),
    bounceRate: ratio(t.bounced, t.sent),
    complaintRate: ratio(t.complained, t.sent),
    openRate: ratio(t.opened, t.delivered),
    clickRate: ratio(t.clicked, t.delivered),
  };
}

export function summarizeMetrics(
  rows: DailyMetricRow[],
  { days, today = new Date() }: { days: number; today?: Date },
) {
  const range = metricPeriods(days, today);

  const byDay = new Map<string, MetricTotals>();
  const byDomain = new Map<number, MetricTotals>();
  const current = { ...ZERO };
  const previous = { ...ZERO };

  for (const row of rows) {
    if (row.date >= range.start && row.date <= range.end) {
      add(current, row);
      if (!byDay.has(row.date)) byDay.set(row.date, { ...ZERO });
      add(byDay.get(row.date)!, row);
      if (!byDomain.has(row.domainId)) byDomain.set(row.domainId, { ...ZERO });
      add(byDomain.get(row.domainId)!, row);
    } else if (row.date >= range.previousStart && row.date <= range.previousEnd) {
      add(previous, row);
    }
  }

  const series: Array<MetricTotals & { date: string }> = [];
  for (let day = range.start; day <= range.end; day = addDays(day, 1)) {
    series.push({ date: day, ...(byDay.get(day) ?? ZERO) });
  }

  return {
    range,
    series,
    current,
    previous,
    rates: { current: metricRates(current), previous: metricRates(previous) },
    byDomain: [...byDomain.entries()]
      .map(([domainId, totals]) => ({ domainId, ...totals, rates: metricRates(totals) }))
      .sort((a, b) => b.sent - a.sent || a.domainId - b.domainId),
  };
}

/** Relative change of a count, e.g. 0.124 for +12.4%. Null when there is no base. */
export function countChange(current: number, previous: number) {
  return previous > 0 ? (current - previous) / previous : null;
}

/** Change of a rate in percentage points, e.g. 0.0031 → +0.31 pt. */
export function rateChange(current: number | null, previous: number | null) {
  return current !== null && previous !== null ? current - previous : null;
}
