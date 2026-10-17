import { CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import Spinner from "@usesend/ui/src/spinner";
import { Badge } from "@usesend/ui/src/badge";
import { PLAN_PERKS } from "~/lib/constants/payments";
import { describePlanLimits, formatIdr } from "~/lib/plan-format";
import { api } from "~/trpc/react";

const STATE_BADGE = {
  free: { label: "Gratis", variant: "secondary" },
  active: { label: "Aktif", variant: "default" },
  grace: { label: "Masa tenggang", variant: "destructive" },
  expired: { label: "Berakhir", variant: "destructive" },
} as const;

export const PlanDetails = () => {
  const { data: overview, isLoading } = api.billing.getPlanOverview.useQuery();

  if (isLoading) {
    return <Spinner className="h-4 w-4" />;
  }

  if (!overview) {
    return null;
  }

  const { plan, state, limits, periodEnd, graceEnd, kind } = overview;
  const badge = STATE_BADGE[state];

  if (kind === "legacy") {
    return (
      <div>
        <div className="text-lg">Basic</div>
        <div className="text-muted-foreground text-sm">Current plan</div>
        <ul className="mt-4 space-y-3">
          {(PLAN_PERKS.BASIC ?? []).map((perk, index) => (
            <li key={index} className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green flex-shrink-0" />
              <span className="text-sm">{perk}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="text-lg font-semibold">{plan?.name ?? "Free"}</div>
        <Badge variant={badge.variant}>{badge.label}</Badge>
      </div>
      <div className="text-muted-foreground text-sm mt-1">
        Paket saat ini
        {plan && !plan.isDefault ? ` · ${formatIdr(plan.priceIdr)}` : ""}
      </div>

      {periodEnd ? (
        <div className="mt-3 text-sm">
          {state === "active"
            ? `Berlaku sampai ${format(new Date(periodEnd), "dd MMM yyyy")}`
            : `Berakhir pada ${format(new Date(periodEnd), "dd MMM yyyy")}`}
        </div>
      ) : null}

      {state === "grace" && graceEnd ? (
        <div
          role="status"
          className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-600 dark:text-amber-400"
        >
          Paket kamu sudah berakhir. Pengiriman tetap berjalan sampai{" "}
          {format(new Date(graceEnd), "dd MMM yyyy")}, setelah itu tim kembali
          ke paket Free. Perpanjang sekarang agar tidak terputus.
        </div>
      ) : null}

      <ul className="mt-4 space-y-3">
        {describePlanLimits(limits).map((row) => (
          <li key={row.label} className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green flex-shrink-0" />
            <span className="text-sm">
              {row.label}: <span className="font-medium">{row.value}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};
