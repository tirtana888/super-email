import type { BillingPlan, Subscription, Team } from "@prisma/client";
import { PLAN_LIMITS } from "~/lib/constants/plans";
import {
  resolvePlanLimits,
  type PlanLimits,
} from "~/lib/plan-limits";
import { db } from "../db";
import { getRedis, redisKey, withCache } from "../redis";

const PLAN_CACHE_TTL_SECONDS = 60;
const DEFAULT_PLAN_CACHE_KEY = "billing-plan:default";

function planCacheKey(planId: string) {
  return `billing-plan:${planId}`;
}

export class PlanService {
  static async getDefaultPlan(): Promise<BillingPlan | null> {
    return withCache(
      DEFAULT_PLAN_CACHE_KEY,
      () => db.billingPlan.findFirst({ where: { isDefault: true } }),
      { ttlSeconds: PLAN_CACHE_TTL_SECONDS },
    );
  }

  static async getPlan(planId: string): Promise<BillingPlan | null> {
    return withCache(
      planCacheKey(planId),
      () => db.billingPlan.findUnique({ where: { id: planId } }),
      { ttlSeconds: PLAN_CACHE_TTL_SECONDS },
    );
  }

  /** The latest payment decides which plan and period are current. */
  static async getCurrentSubscription(
    teamId: number,
  ): Promise<Subscription | null> {
    return db.subscription.findFirst({
      where: { teamId },
      orderBy: { createdAt: "desc" },
    });
  }

  static async invalidatePlanCache(planId?: string) {
    const redis = getRedis();
    const keys = [redisKey(DEFAULT_PLAN_CACHE_KEY)];

    if (planId) {
      keys.push(redisKey(planCacheKey(planId)));
    }

    await redis.del(...keys);
  }

  static async getLimitsForTeam(
    team: Pick<Team, "isActive" | "plan" | "billingPlanId">,
  ): Promise<PlanLimits> {
    const [teamPlan, defaultPlan] = await Promise.all([
      team.billingPlanId ? PlanService.getPlan(team.billingPlanId) : null,
      PlanService.getDefaultPlan(),
    ]);

    return resolvePlanLimits({
      isActive: team.isActive,
      legacyPlan: team.plan,
      teamPlan,
      defaultPlan,
      fallback: PLAN_LIMITS,
    });
  }
}
