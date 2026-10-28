import { db } from "~/server/db";
import { format, subDays } from "date-fns";
import { Prisma, Team } from "@prisma/client";
import {
  metricPeriods,
  summarizeMetrics,
  type DailyMetricRow,
} from "~/lib/metrics-summary";

type EmailTimeSeries = {
  days?: number;
  domain?: number;
  team: Team;
};

export async function emailTimeSeries(input: EmailTimeSeries) {
  const days = input.days !== 7 ? 30 : 7;
  const { domain, team } = input;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const isoStartDate = startDate.toISOString().split("T")[0];

  type DailyEmailUsage = {
    date: string;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    complained: number;
  };

  const result = await db.$queryRaw<Array<DailyEmailUsage>>`
    SELECT
      date,
      SUM(sent)::integer AS sent,
      SUM(delivered)::integer AS delivered,
      SUM(opened)::integer AS opened,
      SUM(clicked)::integer AS clicked,
      SUM(bounced)::integer AS bounced,
      SUM(complained)::integer AS complained
    FROM "DailyEmailUsage"
    WHERE "teamId" = ${team.id}
    AND "date" >= ${isoStartDate}
    ${domain ? Prisma.sql`AND "domainId" = ${domain}` : Prisma.sql``}
    GROUP BY "date"
    ORDER BY "date" ASC
  `;

  // Fill in any missing dates with 0 values
  const filledResult: DailyEmailUsage[] = [];
  const endDateObj = new Date();

  for (let i = days; i > -1; i--) {
    const dateStr = subDays(endDateObj, i)
      .toISOString()
      .split("T")[0] as string;
    const existingData = result.find((r) => r.date === dateStr);

    if (existingData) {
      filledResult.push({
        ...existingData,
        date: format(dateStr, "MMM dd"),
      });
    } else {
      filledResult.push({
        date: format(dateStr, "MMM dd"),
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        bounced: 0,
        complained: 0,
      });
    }
  }

  const totalCounts = result.reduce(
    (acc, curr) => {
      acc.sent += curr.sent;
      acc.delivered += curr.delivered;
      acc.opened += curr.opened;
      acc.clicked += curr.clicked;
      acc.bounced += curr.bounced;
      acc.complained += curr.complained;
      return acc;
    },
    {
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      bounced: 0,
      complained: 0,
    },
  );

  return { result: filledResult, totalCounts };
}

/**
 * KPIs for the selected period and the one before it, a daily series and a
 * per-domain breakdown, all from DailyEmailUsage in one query.
 */
export async function metricsOverview(input: {
  team: Team;
  days: number;
  domain?: number;
}) {
  const { team, days, domain } = input;
  const range = metricPeriods(days);

  const rows = await db.$queryRaw<Array<DailyMetricRow>>`
    SELECT
      date,
      "domainId",
      SUM(sent)::integer AS sent,
      SUM(delivered)::integer AS delivered,
      SUM(opened)::integer AS opened,
      SUM(clicked)::integer AS clicked,
      SUM(bounced)::integer AS bounced,
      SUM(complained)::integer AS complained
    FROM "DailyEmailUsage"
    WHERE "teamId" = ${team.id}
    AND "date" >= ${range.previousStart}
    AND "date" <= ${range.end}
    ${domain ? Prisma.sql`AND "domainId" = ${domain}` : Prisma.empty}
    GROUP BY date, "domainId"
  `;

  const summary = summarizeMetrics(rows, { days });

  const domains = await db.domain.findMany({
    where: { teamId: team.id, id: { in: summary.byDomain.map((d) => d.domainId) } },
    select: { id: true, name: true },
  });
  const nameById = new Map(domains.map((d) => [d.id, d.name]));

  return {
    ...summary,
    byDomain: summary.byDomain.map((d) => ({
      ...d,
      name: nameById.get(d.domainId) ?? `Domain #${d.domainId}`,
    })),
  };
}

type ReputationMetricsData = {
  domain?: number;
  team: Team;
};

export async function reputationMetricsData(input: ReputationMetricsData) {
  const { domain, team } = input;

  const reputations = await db.cumulatedMetrics.findMany({
    where: {
      teamId: team.id,
      ...(domain ? { domainId: domain } : {}),
    },
  });

  const results = reputations.reduce(
    (acc, curr) => {
      acc.delivered += Number(curr.delivered);
      acc.hardBounced += Number(curr.hardBounced);
      acc.complained += Number(curr.complained);
      return acc;
    },
    { delivered: 0, hardBounced: 0, complained: 0 },
  );

  const resultWithRates = {
    ...results,
    bounceRate: results.delivered
      ? (results.hardBounced / results.delivered) * 100
      : 0,
    complaintRate: results.delivered
      ? (results.complained / results.delivered) * 100
      : 0,
  };

  return resultWithRates;
}
