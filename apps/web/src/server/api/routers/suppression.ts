import { SuppressionReason } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, teamProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { logger } from "~/server/logger/log";
import { SuppressionService } from "~/server/service/suppression-service";

export const MAX_SUPPRESSIONS_PER_REMOVAL = 100;

export const suppressionRouter = createTRPCRouter({
  // Get suppression list for team with pagination
  getSuppressions: teamProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        search: z.string().optional(),
        reason: z.nativeEnum(SuppressionReason).optional().nullable(),
        sortBy: z.enum(["email", "reason", "createdAt"]).default("createdAt"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, limit, search, reason, sortBy, sortOrder } = input;

      const result = await SuppressionService.getSuppressionList({
        teamId: ctx.team.id,
        page,
        limit,
        search,
        reason,
        sortBy,
        sortOrder,
      });

      const sourceIds = [
        ...new Set(
          result.suppressions
            .map((suppression) => suppression.source)
            .filter((id): id is string => Boolean(id)),
        ),
      ];
      const sourceEmails = sourceIds.length
        ? await db.email.findMany({
            where: { id: { in: sourceIds }, teamId: ctx.team.id },
            select: { id: true, subject: true },
          })
        : [];
      const subjectById = new Map(sourceEmails.map((email) => [email.id, email.subject]));

      return {
        suppressions: result.suppressions.map((suppression) => ({
          ...suppression,
          sourceEmail:
            suppression.source && subjectById.has(suppression.source)
              ? { id: suppression.source, subject: subjectById.get(suppression.source) ?? "" }
              : null,
        })),
        pagination: {
          page,
          limit,
          totalCount: result.total,
          totalPages: Math.ceil(result.total / limit),
          hasNext: page * limit < result.total,
          hasPrev: page > 1,
        },
      };
    }),

  // Add manual suppression
  addSuppression: teamProcedure
    .input(
      z.object({
        email: z.string().email(),
        reason: z
          .nativeEnum(SuppressionReason)
          .default(SuppressionReason.MANUAL),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return SuppressionService.addSuppression({
        email: input.email,
        teamId: ctx.team.id,
        reason: input.reason,
      });
    }),

  // Remove suppression
  removeSuppression: teamProcedure
    .input(
      z.object({
        email: z.string().email(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await SuppressionService.removeSuppression(input.email, ctx.team.id);
    }),

  // Remove several addresses at once. Addresses that reported spam are only
  // removed when the request confirms it, so the guard cannot be skipped by
  // calling the API directly.
  removeSuppressions: teamProcedure
    .input(
      z.object({
        emails: z
          .array(z.string().email())
          .min(1)
          .max(MAX_SUPPRESSIONS_PER_REMOVAL),
        confirmComplaints: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const emails = [
        ...new Set(input.emails.map((email) => email.toLowerCase().trim())),
      ];
      const existing = await db.suppressionList.findMany({
        where: { teamId: ctx.team.id, email: { in: emails } },
        select: { email: true, reason: true },
      });
      const complaints = existing.filter(
        (row) => row.reason === SuppressionReason.COMPLAINT,
      );

      if (complaints.length > 0 && !input.confirmComplaints) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `${complaints.length} of these addresses reported your email as spam. Confirm before removing them.`,
        });
      }

      const failed: string[] = [];
      for (const row of existing) {
        try {
          await SuppressionService.removeSuppression(row.email, ctx.team.id);
        } catch {
          failed.push(row.email);
        }
      }

      logger.info(
        {
          teamId: ctx.team.id,
          userId: ctx.session.user.id,
          requested: emails.length,
          removed: existing.length - failed.length,
          complaintsRemoved: complaints.filter((row) => !failed.includes(row.email)).length,
          failed: failed.length,
        },
        "[suppression]: addresses removed from the exclusion list",
      );

      return {
        removed: existing.length - failed.length,
        failed,
        notFound: emails.length - existing.length,
      };
    }),

  // Bulk add suppressions
  bulkAddSuppressions: teamProcedure
    .input(
      z.object({
        emails: z.array(z.string().email()).max(1000),
        reason: z
          .nativeEnum(SuppressionReason)
          .default(SuppressionReason.MANUAL),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return SuppressionService.addMultipleSuppressions(
        ctx.team.id,
        input.emails,
        input.reason
      );
    }),

  // Check if email is suppressed
  checkSuppression: teamProcedure
    .input(
      z.object({
        email: z.string().email(),
      })
    )
    .query(async ({ ctx, input }) => {
      return SuppressionService.isEmailSuppressed(input.email, ctx.team.id);
    }),

  // Check multiple emails for suppression
  checkMultipleSuppressions: teamProcedure
    .input(
      z.object({
        emails: z.array(z.string().email()).max(100),
      })
    )
    .query(async ({ ctx, input }) => {
      return SuppressionService.checkMultipleEmails(input.emails, ctx.team.id);
    }),

  // Get suppression stats
  getSuppressionStats: teamProcedure.query(async ({ ctx }) => {
    return SuppressionService.getSuppressionStats(ctx.team.id);
  }),

  // Export suppressions (for download functionality)
  exportSuppressions: teamProcedure
    .input(
      z.object({
        reason: z.nativeEnum(SuppressionReason).optional().nullable(),
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Get all suppressions without pagination for export
      const result = await SuppressionService.getSuppressionList({
        teamId: ctx.team.id,
        page: 1,
        limit: 10000, // Large limit for export
        search: input.search,
        reason: input.reason,
        sortBy: "createdAt",
        sortOrder: "desc",
      });

      return result.suppressions.map((suppression) => ({
        email: suppression.email,
        reason: suppression.reason,
        source: suppression.source,
        createdAt: suppression.createdAt.toISOString(),
      }));
    }),
});
