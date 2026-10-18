import { TRPCError } from "@trpc/server";
import { describeTeamPlan } from "~/lib/plan-label";
import {
  MANUAL_PAYMENT_METHOD,
  manualSubscriptionId,
  planAssignment,
  type AssignmentTarget,
} from "~/lib/plan-assignment";
import { db } from "../db";

export type AssignPlanInput = {
  teamId: number;
  target: { kind: "catalog"; planId: string } | { kind: "legacy-unlimited" };
  endsAt: Date | null;
  note?: string;
  actor: { id: number | null; email: string | null };
  now?: Date;
};

export const PLAN_ASSIGNED_ACTION = "team.plan.assigned";

export class TeamPlanService {
  /**
   * Changes a team's plan by hand. Everything is written in one transaction: the team, the
   * subscription row that carries the end date, and the audit entry.
   */
  static async assign(input: AssignPlanInput) {
    const now = input.now ?? new Date();

    return db.$transaction(async (tx) => {
      const team = await tx.team.findUnique({
        where: { id: input.teamId },
        select: {
          id: true,
          name: true,
          plan: true,
          isActive: true,
          billingPlan: { select: { name: true, isDefault: true } },
        },
      });

      if (!team) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
      }

      const defaultPlan = await tx.billingPlan.findFirst({
        where: { isDefault: true },
        select: { id: true },
      });

      if (!defaultPlan) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "There is no default plan configured.",
        });
      }

      let target: AssignmentTarget;

      if (input.target.kind === "legacy-unlimited") {
        target = { kind: "legacy-unlimited" };
      } else {
        const plan = await tx.billingPlan.findUnique({
          where: { id: input.target.planId },
          select: { id: true, name: true, isDefault: true, isActive: true },
        });

        if (!plan) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Plan not found" });
        }

        if (!plan.isActive && !plan.isDefault) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "This plan is not active, so it cannot be assigned.",
          });
        }

        target = { kind: "catalog", plan };
      }

      let assignment;
      try {
        assignment = planAssignment({
          target,
          defaultPlanId: defaultPlan.id,
          endsAt: input.endsAt,
          now,
        });
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Invalid plan change",
        });
      }

      const previous = describeTeamPlan(team);

      await tx.team.update({
        where: { id: team.id },
        data: { ...assignment.team, isActive: true },
      });

      if (assignment.cancelActiveSubscriptions) {
        await tx.subscription.updateMany({
          where: { teamId: team.id, status: "active" },
          data: { status: "canceled" },
        });
      }

      if (assignment.subscription) {
        await tx.subscription.create({
          data: {
            id: manualSubscriptionId(team.id, now),
            teamId: team.id,
            status: "active",
            priceId: assignment.subscription.priceId,
            priceIds: [assignment.subscription.priceId],
            currentPeriodStart: assignment.subscription.currentPeriodStart,
            currentPeriodEnd: assignment.subscription.currentPeriodEnd,
            paymentMethod: MANUAL_PAYMENT_METHOD,
          },
        });
      }

      await tx.adminAuditLog.create({
        data: {
          actorUserId: input.actor.id,
          actorEmail: input.actor.email,
          action: PLAN_ASSIGNED_ACTION,
          teamId: team.id,
          details: {
            teamName: team.name,
            fromPlan: previous.label,
            toPlan: assignment.label,
            endsAt: assignment.endsAt ? assignment.endsAt.toISOString() : null,
            permanent: assignment.subscription
              ? assignment.endsAt === null
              : null,
            note: input.note?.trim() || null,
            reactivated: !team.isActive,
          },
        },
      });

      return {
        teamId: team.id,
        from: previous.label,
        to: assignment.label,
        endsAt: assignment.endsAt,
      };
    });
  }

  static async history(teamId: number) {
    return db.adminAuditLog.findMany({
      where: { teamId, action: PLAN_ASSIGNED_ACTION },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 10,
      select: {
        id: true,
        createdAt: true,
        actorEmail: true,
        details: true,
      },
    });
  }
}
