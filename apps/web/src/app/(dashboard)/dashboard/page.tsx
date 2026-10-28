"use client";

import EmailChart from "./email-chart";
import DashboardFilters from "./dashboard-filters";
import { H1 } from "@usesend/ui";
import { useUrlState } from "~/hooks/useUrlState";
import { ReputationMetrics } from "./reputation-metrics";

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
        <div className=" space-y-12">
          <EmailChart days={Number(days ?? "30")} domain={domain} />

          <ReputationMetrics days={Number(days ?? "30")} domain={domain} />
        </div>
      </div>
    </div>
  );
}
