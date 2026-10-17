import { DailyEmailUsage, EmailUsageType, Subscription } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { format, sub } from "date-fns";
import { z } from "zod";
import { getThisMonthUsage } from "~/server/service/usage-service";

import {
  apiKeyProcedure,
  createTRPCRouter,
  teamAdminProcedure,
  teamProcedure,
} from "~/server/api/trpc";
import {
  createCheckoutSessionForTeam,
  getManageSessionUrl,
} from "~/server/billing/payments";
import { createXenditInvoice } from "~/server/billing/xendit";
import { db } from "~/server/db";
import { TeamService } from "~/server/service/team-service";
import { PlanService } from "~/server/service/plan-service";
import { getGraceEnd, getPeriodState } from "~/lib/plan-lifecycle";

export const billingRouter = createTRPCRouter({
  getAvailablePlans: teamProcedure.query(async () => {
    return await db.billingPlan.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { priceIdr: "asc" }],
    });
  }),

  getPlanOverview: teamProcedure.query(async ({ ctx }) => {
    const team = ctx.team;

    const [ownPlan, defaultPlan, limits, subscription] = await Promise.all([
      team.billingPlanId ? PlanService.getPlan(team.billingPlanId) : null,
      PlanService.getDefaultPlan(),
      PlanService.getLimitsForTeam(team),
      PlanService.getCurrentSubscription(team.id),
    ]);

    // Inactive teams are treated as being on the default plan, same as the limit checks.
    const plan = team.isActive && ownPlan ? ownPlan : defaultPlan;
    const isLegacy = !ownPlan && team.plan === "BASIC";
    const onPaidPlan = Boolean(plan && !plan.isDefault);

    const periodEnd = onPaidPlan
      ? (subscription?.currentPeriodEnd ?? null)
      : null;
    const periodState = periodEnd ? getPeriodState(periodEnd, new Date()) : null;

    return {
      kind: isLegacy ? ("legacy" as const) : ("plan" as const),
      state: !onPaidPlan
        ? ("free" as const)
        : periodState === null || periodState === "active"
          ? ("active" as const)
          : periodState,
      plan: plan
        ? {
            id: plan.id,
            name: plan.name,
            priceIdr: plan.priceIdr,
            intervalMonths: plan.intervalMonths,
            isDefault: plan.isDefault,
            features: plan.features,
          }
        : null,
      limits: {
        ...limits,
        // An admin-set team limit overrides the plan's daily limit
        emailsPerDay: team.dailyEmailLimit ?? limits.emailsPerDay,
      },
      periodStart: onPaidPlan ? (subscription?.currentPeriodStart ?? null) : null,
      periodEnd,
      graceEnd: periodEnd ? getGraceEnd(periodEnd) : null,
    };
  }),

  createXenditCheckoutSession: teamAdminProcedure
    .input(z.object({ planId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const invoice = await createXenditInvoice({
        teamId: ctx.team.id,
        planId: input.planId,
        userEmail: ctx.session.user.email ?? "",
      });

      return invoice.invoice_url;
    }),

  createCheckoutSession: teamAdminProcedure.mutation(async ({ ctx }) => {
    return (await createCheckoutSessionForTeam(ctx.team.id)).url;
  }),

  getManageSessionUrl: teamAdminProcedure.mutation(async ({ ctx }) => {
    return await getManageSessionUrl(ctx.team.id);
  }),

  getThisMonthUsage: teamProcedure.query(async ({ ctx }) => {
    return await getThisMonthUsage(ctx.team.id);
  }),

  getSubscriptionDetails: teamProcedure.query(async ({ ctx }) => {
    const subscription = await db.subscription.findFirst({
      where: { teamId: ctx.team.id },
      orderBy: { createdAt: "desc" },
    });

    return subscription;
  }),

  updateBillingEmail: teamAdminProcedure
    .input(
      z.object({
        billingEmail: z.string().email(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { billingEmail } = input;

      await TeamService.updateTeam(ctx.team.id, { billingEmail });
    }),
});
