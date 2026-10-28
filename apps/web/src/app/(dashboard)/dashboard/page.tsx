"use client";

import DashboardFilters from "./dashboard-filters";
import MetricsOverview from "./metrics-overview";
import { H1 } from "@usesend/ui";
import { useUrlState } from "~/hooks/useUrlState";

export default function Dashboard() {
  const [days, setDays] = useUrlState("days", "30");
  const [domain, setDomain] = useUrlState("domain");

  return (
    <div>
      <div className="w-full">
        <div className="flex justify-between items-start gap-4 mb-8">
          <div>
            <H1>Metrics</H1>
            <p className="mt-1 text-sm text-muted-foreground">
              Delivery and reputation for your sending domains.
            </p>
          </div>
          <DashboardFilters
            days={days ?? "30"}
            setDays={setDays}
            domain={domain}
            setDomain={setDomain}
          />
        </div>
        <MetricsOverview
          days={[7, 30, 90].includes(Number(days)) ? Number(days) : 30}
          domain={domain}
        />
      </div>
    </div>
  );
}
