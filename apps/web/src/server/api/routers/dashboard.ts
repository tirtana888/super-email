import { z } from "zod";
import { createTRPCRouter, teamProcedure } from "~/server/api/trpc";
import {
  emailTimeSeries,
  metricsOverview,
  reputationMetricsData,
} from "~/server/service/dashboard-service";
import { METRIC_PERIODS } from "~/lib/metrics-summary";

export const dashboardRouter = createTRPCRouter({
  emailTimeSeries: teamProcedure
    .input(
      z.object({
        days: z.number().optional(),
        domain: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { team } = ctx;

      const response = await emailTimeSeries({team, days: input.days, domain: input.domain})

      return response
    }),

  overview: teamProcedure
    .input(
      z.object({
        days: z
          .number()
          .refine((d) => (METRIC_PERIODS as readonly number[]).includes(d))
          .default(30),
        domain: z.number().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return metricsOverview({ team: ctx.team, days: input.days, domain: input.domain });
    }),

  reputationMetricsData: teamProcedure
    .input(
      z.object({
        domain: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { team } = ctx;
      const response = await reputationMetricsData({team, domain: input.domain})

      return response;
    }),
});
