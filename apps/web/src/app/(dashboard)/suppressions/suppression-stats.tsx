"use client";

import { api } from "~/trpc/react";

export default function SuppressionStats() {
  const { data: stats, isLoading } =
    api.suppression.getSuppressionStats.useQuery();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-2 rounded-md border bg-card p-4"
          >
            <div className="h-4 bg-muted animate-pulse rounded mb-1" />
            <div className="h-8 bg-muted animate-pulse rounded" />
          </div>
        ))}
      </div>
    );
  }

  const totalSuppressions = stats
    ? Object.values(stats).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
      <div className="flex flex-col gap-2 rounded-md border bg-card p-4">
        <p className="text-xs font-medium text-muted-foreground">Total</p>
        <div className="text-2xl font-semibold tabular-nums">{totalSuppressions}</div>
      </div>

      <div className="flex flex-col gap-2 rounded-md border bg-card p-4">
        <p className="text-xs font-medium text-muted-foreground">Hard bounces</p>
        <div className="text-2xl font-semibold tabular-nums">
          {stats?.HARD_BOUNCE ?? 0}
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-md border bg-card p-4">
        <p className="text-xs font-medium text-muted-foreground">Complaints</p>
        <div className="text-2xl font-semibold tabular-nums">
          {stats?.COMPLAINT ?? 0}
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-md border bg-card p-4">
        <p className="text-xs font-medium text-muted-foreground">Manual</p>
        <div className="text-2xl font-semibold tabular-nums">{stats?.MANUAL ?? 0}</div>
      </div>
    </div>
  );
}
