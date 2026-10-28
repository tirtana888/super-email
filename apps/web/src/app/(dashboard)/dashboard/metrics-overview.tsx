"use client";

import Link from "next/link";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Spinner from "@usesend/ui/src/spinner";
import { StatusDot, type StatusTone } from "@usesend/ui/src/status-dot";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@usesend/ui/src/table";
import { api } from "~/trpc/react";
import {
  COMPLAINED_RISK_RATE,
  COMPLAINED_WARNING_RATE,
  HARD_BOUNCE_RISK_RATE,
  HARD_BOUNCE_WARNING_RATE,
} from "~/lib/constants";
import {
  countChange,
  metricRates,
  rateChange,
  type MetricRates,
  type MetricTotals,
} from "~/lib/metrics-summary";
import { useColors } from "./hooks/useColors";

type Health = "HEALTHY" | "WARNING" | "RISK";

// Thresholds are stored as percentages (5 = 5%).
function healthOf(percent: number, warning: number, risk: number): Health {
  if (percent > risk) return "RISK";
  if (percent > warning) return "WARNING";
  return "HEALTHY";
}

const healthTone: Record<Health, StatusTone> = {
  HEALTHY: "ok",
  WARNING: "warn",
  RISK: "bad",
};

const healthLabel: Record<Health, string> = {
  HEALTHY: "Healthy",
  WARNING: "Warning",
  RISK: "At risk",
};

function pct(value: number | null, digits = 1) {
  return value === null ? "—" : `${(value * 100).toFixed(digits)}%`;
}

function signed(value: number, text: string) {
  return `${value > 0 ? "+" : value < 0 ? "−" : ""}${text}`;
}

const dayLabel = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values, 0);
  const w = 120;
  const h = 24;
  if (values.length < 2 || max === 0) {
    return (
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden>
        <line x1="0" x2={w} y1={h - 2} y2={h - 2} stroke="hsl(var(--border))" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      </svg>
    );
  }
  const points = values
    .map((v, i) => `${(i / (values.length - 1)) * w},${h - 2 - (v / max) * (h - 4)}`)
    .join(" ");
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden>
      <polyline fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" points={points} />
    </svg>
  );
}

type Kpi = {
  label: string;
  /** How the figure is calculated, shown on hover. */
  definition: string;
  value: string;
  /** The count behind the figure, e.g. "405 bounced". */
  detail: string;
  change: string | null;
  // Whether this change is good news, bad news or neither.
  tone: "good" | "bad" | "neutral";
  spark: number[];
  color: string;
};

function buildKpis(
  current: MetricTotals,
  previous: MetricTotals,
  rates: { current: MetricRates; previous: MetricRates },
  series: Array<MetricTotals & { date: string }>,
  colors: ReturnType<typeof useColors>,
): Kpi[] {
  const daily = series.map((d) => metricRates(d));
  const rateKpi = (
    label: string,
    key: keyof MetricRates,
    color: string,
    higherIsBetter: boolean,
    detail: string,
    definition: string,
    digits = 1,
  ): Kpi => {
    const change = rateChange(rates.current[key], rates.previous[key]);
    return {
      label,
      definition,
      value: pct(rates.current[key], digits),
      detail,
      change:
        change === null ? null : signed(change, `${Math.abs(change * 100).toFixed(digits)} pt`),
      tone:
        change === null || change === 0
          ? "neutral"
          : (change > 0) === higherIsBetter
            ? "good"
            : "bad",
      spark: daily.map((d) => d[key] ?? 0),
      color,
    };
  };

  const sentChange = countChange(current.sent, previous.sent);
  const perDay = series.length ? Math.round(current.sent / series.length) : 0;
  const n = (v: number) => v.toLocaleString();
  return [
    {
      label: "Sent",
      definition: "Emails accepted for sending in this period.",
      value: n(current.sent),
      detail: `${n(perDay)} per day on average`,
      change: sentChange === null ? null : signed(sentChange, `${Math.abs(sentChange * 100).toFixed(1)}%`),
      tone: "neutral",
      spark: series.map((d) => d.sent),
      color: colors.clicked,
    },
    rateKpi("Delivered", "deliveredRate", colors.delivered, true, `${n(current.delivered)} delivered`, "Delivered ÷ sent."),
    rateKpi("Bounce rate", "bounceRate", colors.bounced, false, `${n(current.bounced)} bounced`, "Bounced ÷ sent.", 2),
    rateKpi("Complaint rate", "complaintRate", colors.complained, false, `${n(current.complained)} spam complaints`, "Spam complaints ÷ sent.", 3),
    rateKpi("Open rate", "openRate", colors.xaxis, true, `${n(current.opened)} opened`, "Opened ÷ delivered. Needs open tracking on the domain."),
    rateKpi("Click rate", "clickRate", colors.xaxis, true, `${n(current.clicked)} clicked`, "Clicked ÷ delivered. Needs click tracking on the domain."),
  ];
}

function HealthBar({
  title,
  percent,
  warning,
  risk,
  digits,
}: {
  title: string;
  percent: number;
  warning: number;
  risk: number;
  digits: number;
}) {
  const health = healthOf(percent, warning, risk);
  const scaleMax = risk * 1.2;
  const at = (v: number) => `${Math.min(100, (v / scaleMax) * 100)}%`;
  const fill = health === "HEALTHY" ? "bg-green" : health === "WARNING" ? "bg-yellow" : "bg-red";

  return (
    <div className="flex flex-col gap-2 rounded-md border bg-card px-4 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <StatusDot tone={healthTone[health]}>
          {title} · {healthLabel[health]}
        </StatusDot>
        <span className="text-lg font-semibold tabular-nums">{percent.toFixed(digits)}%</span>
      </div>
      <div className="relative h-1.5 rounded-full border bg-muted">
        <span className={`absolute inset-y-[-1px] left-0 rounded-full ${fill}`} style={{ width: at(percent) }} />
        <span className="absolute -inset-y-1 w-px bg-muted-foreground" style={{ left: at(warning) }} />
        <span className="absolute -inset-y-1 w-px bg-muted-foreground" style={{ left: at(risk) }} />
      </div>
      <div className="relative h-4 text-[11px] tabular-nums text-muted-foreground">
        <span className="absolute left-0">0%</span>
        <span className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: at(warning) }}>
          {warning}% warning
        </span>
        <span className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: at(risk) }}>
          {risk}% risk
        </span>
      </div>
    </div>
  );
}

export default function MetricsOverview({ days, domain }: { days: number; domain: string | null }) {
  const colors = useColors();
  const domainId = domain ? Number(domain) : undefined;

  const overview = api.dashboard.overview.useQuery({ days, domain: domainId });
  const reputation = api.dashboard.reputationMetricsData.useQuery({ domain: domainId });

  if (overview.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-6 w-6" innerSvgClass="stroke-primary" />
      </div>
    );
  }

  if (!overview.data) {
    return <p className="text-sm text-muted-foreground">Metrics could not be loaded. Refresh to try again.</p>;
  }

  const { current, previous, rates, series, byDomain } = overview.data;
  const kpis = buildKpis(current, previous, rates, series, colors);
  const chartData = series.map((d) => ({ ...d, label: dayLabel(d.date) }));

  return (
    <div className="flex flex-col gap-6">
      <section aria-label="Key figures" className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold tracking-tight">Overview</h2>
          <span className="text-xs text-muted-foreground">
            Last {days} days · changes compared with the {days} days before
          </span>
        </div>
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border bg-border md:grid-cols-3 2xl:grid-cols-6">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="flex min-w-0 flex-col bg-card px-4 pb-3 pt-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs font-medium text-muted-foreground" title={kpi.definition}>
                  {kpi.label}
                </span>
                {kpi.change ? (
                  <span
                    className={`shrink-0 rounded px-1.5 py-px text-[11px] font-medium tabular-nums ${
                      kpi.tone === "good"
                        ? "bg-green/10 text-green"
                        : kpi.tone === "bad"
                          ? "bg-red/10 text-red"
                          : "bg-muted text-muted-foreground"
                    }`}
                    title={`Change compared with the previous ${days} days`}
                  >
                    {kpi.change}
                  </span>
                ) : (
                  <span className="shrink-0 text-[11px] text-muted-foreground" title="No sends in the previous period to compare with">
                    New
                  </span>
                )}
              </div>
              <span className="mt-1.5 text-2xl font-semibold tabular-nums leading-none tracking-tight">
                {kpi.value}
              </span>
              <span className="mt-1.5 truncate text-xs tabular-nums text-muted-foreground">{kpi.detail}</span>
              <div className="mt-2">
                <Sparkline values={kpi.spark} color={kpi.color} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section aria-label="Sending reputation" className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-base font-semibold tracking-tight">Reputation</h2>
          <span className="text-xs text-muted-foreground">Hard bounces and complaints since the first send</span>
        </div>
        {reputation.data ? (
          <div className="grid gap-3 md:grid-cols-2">
            <HealthBar
              title="Bounce rate"
              percent={reputation.data.bounceRate}
              warning={HARD_BOUNCE_WARNING_RATE}
              risk={HARD_BOUNCE_RISK_RATE}
              digits={2}
            />
            <HealthBar
              title="Complaint rate"
              percent={reputation.data.complaintRate}
              warning={COMPLAINED_WARNING_RATE}
              risk={COMPLAINED_RISK_RATE}
              digits={3}
            />
          </div>
        ) : (
          <div className="h-[92px] rounded-md border bg-card" />
        )}
      </section>

      <section aria-label="Daily volume" className="flex flex-col gap-3 rounded-md border bg-card px-4 pb-2 pt-3">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-base font-semibold tracking-tight">Daily volume</h2>
          <div className="flex gap-4 text-xs text-muted-foreground">
            {(
              [
                ["Sent", colors.clicked],
                ["Delivered", colors.delivered],
                ["Bounced", colors.bounced],
              ] as const
            ).map(([label, color]) => (
              <span key={label} className="inline-flex items-center gap-1.5">
                <span aria-hidden className="h-0.5 w-3" style={{ background: color }} />
                {label}
              </span>
            ))}
          </div>
        </div>
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                fontSize={11}
                tick={{ fill: colors.xaxis }}
                interval="preserveStartEnd"
                minTickGap={24}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                fontSize={11}
                width={44}
                tick={{ fill: colors.xaxis }}
                allowDecimals={false}
              />
              <Tooltip
                cursor={{ stroke: "hsl(var(--border))" }}
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 6,
                  fontSize: 12,
                  boxShadow: "none",
                }}
                labelStyle={{ color: "hsl(var(--foreground))", marginBottom: 4 }}
              />
              <Line type="monotone" dataKey="sent" name="Sent" stroke={colors.clicked} strokeWidth={1.75} dot={false} />
              <Line type="monotone" dataKey="delivered" name="Delivered" stroke={colors.delivered} strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey="bounced" name="Bounced" stroke={colors.bounced} strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section aria-label="By domain" className="flex flex-col gap-2">
        <h2 className="text-base font-semibold tracking-tight">By domain</h2>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted dark:bg-muted/70">
                <TableHead className="rounded-tl-md">Domain</TableHead>
                <TableHead className="text-right">Sent</TableHead>
                <TableHead className="text-right">Delivered</TableHead>
                <TableHead className="text-right">Bounce</TableHead>
                <TableHead className="text-right">Complaint</TableHead>
                <TableHead className="hidden text-right sm:table-cell">Open</TableHead>
                <TableHead className="rounded-tr-md">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byDomain.length ? (
                byDomain.map((d) => {
                  const bounce = (d.rates.bounceRate ?? 0) * 100;
                  const complaint = (d.rates.complaintRate ?? 0) * 100;
                  const order: Health[] = ["HEALTHY", "WARNING", "RISK"];
                  const health = order[
                    Math.max(
                      order.indexOf(healthOf(bounce, HARD_BOUNCE_WARNING_RATE, HARD_BOUNCE_RISK_RATE)),
                      order.indexOf(healthOf(complaint, COMPLAINED_WARNING_RATE, COMPLAINED_RISK_RATE)),
                    )
                  ]!;
                  return (
                    <TableRow key={d.domainId}>
                      <TableCell className="font-medium">
                        <Link href={`/emails?domain=${d.domainId}&days=${days}`} className="hover:underline hover:underline-offset-4">
                          {d.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right">{d.sent.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{pct(d.rates.deliveredRate)}</TableCell>
                      <TableCell className="text-right">{pct(d.rates.bounceRate, 2)}</TableCell>
                      <TableCell className="text-right">{pct(d.rates.complaintRate, 3)}</TableCell>
                      <TableCell className="hidden text-right sm:table-cell">{pct(d.rates.openRate)}</TableCell>
                      <TableCell>
                        <StatusDot tone={healthTone[health]}>{healthLabel[health]}</StatusDot>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow className="h-24">
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No email sent in the last {days} days.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
