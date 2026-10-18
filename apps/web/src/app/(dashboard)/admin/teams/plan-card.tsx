"use client";

import { useState } from "react";
import type { inferRouterOutputs } from "@trpc/server";
import { format, formatDistanceToNow } from "date-fns";
import { Badge } from "@usesend/ui/src/badge";
import { Button } from "@usesend/ui/src/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@usesend/ui/src/dialog";
import { Input } from "@usesend/ui/src/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@usesend/ui/src/select";
import Spinner from "@usesend/ui/src/spinner";
import { toast } from "@usesend/ui/src/toaster";
import { getPeriodState } from "~/lib/plan-lifecycle";
import { endOfDayJakarta } from "~/lib/plan-assignment";
import { describeTeamPlan } from "~/lib/plan-label";
import type { AppRouter } from "~/server/api/root";
import { api } from "~/trpc/react";

type TeamAdmin = NonNullable<
  inferRouterOutputs<AppRouter>["admin"]["findTeam"]
>;

const LEGACY = "legacy-unlimited";

function dateLabel(date: Date | string) {
  return format(new Date(date), "dd MMM yyyy");
}

function tomorrow() {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return format(date, "yyyy-MM-dd");
}

export function PlanCard({
  team,
  onChanged,
}: {
  team: TeamAdmin;
  onChanged: () => void;
}) {
  const [choice, setChoice] = useState<string>("");
  const [untilDay, setUntilDay] = useState("");
  const [note, setNote] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const plansQuery = api.adminPlans.getAll.useQuery();
  const historyQuery = api.admin.getTeamPlanHistory.useQuery({
    teamId: team.id,
  });

  const assign = api.admin.assignTeamPlan.useMutation({
    onSuccess: async (result) => {
      toast.success(`Plan changed: ${result.from} → ${result.to}`);
      setConfirmOpen(false);
      setChoice("");
      setUntilDay("");
      setNote("");
      await historyQuery.refetch();
      onChanged();
    },
    onError: (error) => {
      setConfirmOpen(false);
      toast.error(error.message);
    },
  });

  const current = describeTeamPlan(team);
  const latest = team.subscription[0] ?? null;
  const periodEnd = latest?.currentPeriodEnd
    ? new Date(latest.currentPeriodEnd)
    : null;
  const manual = latest?.paymentMethod === "ADMIN";
  const periodState = periodEnd ? getPeriodState(periodEnd, new Date()) : null;

  const plans = (plansQuery.data ?? []).filter(
    (plan) => plan.isActive || plan.isDefault,
  );
  const selectedPlan = plans.find((plan) => plan.id === choice) ?? null;
  const isLegacy = choice === LEGACY;
  const needsDate = Boolean(selectedPlan && !selectedPlan.isDefault);
  const untilDate = untilDay ? endOfDayJakarta(untilDay) : null;
  const targetLabel = isLegacy
    ? "Unlimited (legacy)"
    : (selectedPlan?.name ?? "");

  const paidSubscriptionRunning =
    latest &&
    !manual &&
    latest.status === "active" &&
    periodEnd &&
    periodEnd.getTime() > Date.now();

  const dateInvalid = needsDate && untilDay !== "" && !untilDate;
  const canSubmit = Boolean(choice) && !dateInvalid && !assign.isPending;

  const submit = () => {
    if (!choice) return;

    assign.mutate({
      teamId: team.id,
      target: isLegacy
        ? { kind: "legacy-unlimited" }
        : { kind: "catalog", planId: choice },
      endsAt: needsDate ? untilDate : null,
      note: note.trim() || undefined,
    });
  };

  return (
    <div className="space-y-4 rounded-lg border p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-muted-foreground">Plan</h3>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={current.paid ? "default" : "secondary"}>
            {current.label}
          </Badge>
          {current.paid && latest ? (
            <Badge variant="outline">
              {manual ? "Granted by admin" : "Paid"}
            </Badge>
          ) : null}
          {periodState === "grace" ? (
            <Badge variant="destructive">Grace period</Badge>
          ) : null}
          {periodState === "expired" ? (
            <Badge variant="destructive">Expired</Badge>
          ) : null}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {!current.paid
          ? "This team is on the free plan."
          : latest && periodEnd
            ? `Valid until ${dateLabel(periodEnd)} (${formatDistanceToNow(periodEnd, { addSuffix: true })}).`
            : latest
              ? "No end date: the plan stays until an admin changes it."
              : "Set without a subscription record (legacy)."}
      </p>

      {paidSubscriptionRunning ? (
        <div
          role="status"
          className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-600 dark:text-amber-400"
        >
          This team has a paid subscription running until{" "}
          {dateLabel(periodEnd as Date)}. A manual plan replaces it from now on.
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-2">
          <label className="text-sm font-medium">New plan</label>
          <Select
            value={choice}
            onValueChange={(value) => {
              setChoice(value);
              setUntilDay("");
            }}
            disabled={assign.isPending || plansQuery.isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose a plan" />
            </SelectTrigger>
            <SelectContent>
              {plans.map((plan) => (
                <SelectItem key={plan.id} value={plan.id}>
                  {plan.name}
                  {plan.isDefault ? " (default, free)" : ""}
                </SelectItem>
              ))}
              <SelectItem value={LEGACY}>Unlimited (legacy, no limits)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            Valid until (empty = permanent)
          </label>
          <Input
            type="date"
            min={tomorrow()}
            value={untilDay}
            onChange={(event) => setUntilDay(event.target.value)}
            disabled={!needsDate || assign.isPending}
          />
          <p className="text-xs text-muted-foreground">
            {needsDate
              ? "After this day the usual 3-day grace period applies, then the team returns to Free."
              : "Only for paid catalog plans."}
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Reason (optional)</label>
          <Input
            placeholder="e.g. partner, 30-day gift"
            maxLength={200}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            disabled={assign.isPending}
          />
        </div>
      </div>

      {isLegacy ? (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Unlimited removes every limit of the plan. It is not the same as Pro or
          Dev.
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button disabled={!canSubmit} onClick={() => setConfirmOpen(true)}>
          Apply plan
        </Button>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-medium text-muted-foreground">
          Plan history
        </h4>
        {historyQuery.isLoading ? (
          <Spinner className="h-4 w-4" />
        ) : historyQuery.data && historyQuery.data.length > 0 ? (
          <ul className="space-y-1 text-sm">
            {historyQuery.data.map((entry) => {
              const details = entry.details as {
                fromPlan?: string;
                toPlan?: string;
                endsAt?: string | null;
                note?: string | null;
              };

              return (
                <li
                  key={entry.id}
                  className="rounded-md bg-muted/30 px-3 py-2 text-muted-foreground"
                >
                  <span className="text-foreground">
                    {details.fromPlan} → {details.toPlan}
                  </span>{" "}
                  {details.endsAt
                    ? `until ${dateLabel(details.endsAt)}`
                    : details.toPlan === "Free"
                      ? ""
                      : "permanent"}
                  {details.note ? ` · "${details.note}"` : ""} ·{" "}
                  {entry.actorEmail ?? "unknown admin"} ·{" "}
                  {format(new Date(entry.createdAt), "dd MMM yyyy HH:mm")}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">
            No manual plan changes yet.
          </p>
        )}
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change plan for {team.name}?</DialogTitle>
            <DialogDescription>
              {current.label} → {targetLabel}
              {needsDate
                ? untilDate
                  ? `, valid until ${dateLabel(untilDate)}`
                  : ", permanent"
                : ""}
              . The new limits apply immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={assign.isPending}
            >
              Cancel
            </Button>
            <Button onClick={submit} disabled={assign.isPending}>
              {assign.isPending ? "Applying..." : "Yes, apply"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
