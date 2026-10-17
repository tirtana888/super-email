import { z } from "zod";
import { createTRPCRouter, adminProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { TRPCError } from "@trpc/server";
import { PlanService } from "~/server/service/plan-service";

export const billingPlanInputSchema = z.object({
  name: z.string().min(1, "Nama paket harus diisi"),
  slug: z.string().min(1, "Slug harus diisi"),
  description: z.string().optional(),
  priceIdr: z.number().int().min(0, "Harga minimal 0"),
  intervalMonths: z.number().int().min(1).default(1),
  // For every limit below, -1 means unlimited.
  emailQuota: z.number().int().min(-1).default(10000),
  emailsPerDay: z.number().int().min(-1).default(-1),
  domainLimit: z.number().int().min(-1).default(1),
  teamMemberLimit: z.number().int().min(-1).default(3),
  contactBookLimit: z.number().int().min(-1).default(-1),
  webhookLimit: z.number().int().min(-1).default(-1),
  features: z.array(z.string()).default([]),
  isPopular: z.boolean().default(false),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export const adminPlansRouter = createTRPCRouter({
  getAll: adminProcedure.query(async () => {
    return await db.billingPlan.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      include: {
        _count: {
          select: { teams: true },
        },
      },
    });
  }),

  create: adminProcedure
    .input(billingPlanInputSchema)
    .mutation(async ({ input }) => {
      const existing = await db.billingPlan.findUnique({
        where: { slug: input.slug },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Slug paket sudah digunakan",
        });
      }

      const created = await db.billingPlan.create({
        data: { ...input, isDefault: false },
      });
      await PlanService.invalidatePlanCache(created.id);
      return created;
    }),

  update: adminProcedure
    .input(
      billingPlanInputSchema.extend({
        id: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;

      const current = await db.billingPlan.findUnique({ where: { id } });

      if (!current) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Paket tidak ditemukan",
        });
      }

      if (current.isDefault) {
        // The default (Free) plan stays free, active and keeps its slug.
        data.slug = current.slug;
        data.priceIdr = 0;
        data.isActive = true;
      }

      const existingSlug = await db.billingPlan.findFirst({
        where: {
          slug: data.slug,
          NOT: { id },
        },
      });

      if (existingSlug) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Slug paket sudah digunakan oleh paket lain",
        });
      }

      const updated = await db.billingPlan.update({
        where: { id },
        data,
      });
      await PlanService.invalidatePlanCache(id);
      return updated;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const plan = await db.billingPlan.findUnique({
        where: { id: input.id },
        include: {
          _count: {
            select: { teams: true },
          },
        },
      });

      if (!plan) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Paket tidak ditemukan",
        });
      }

      if (plan.isDefault) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Paket default (Free) tidak bisa dihapus atau dinonaktifkan",
        });
      }

      if (plan._count.teams > 0) {
        // Soft-delete by disabling if active teams are using it
        const disabled = await db.billingPlan.update({
          where: { id: input.id },
          data: { isActive: false },
        });
        await PlanService.invalidatePlanCache(input.id);
        return disabled;
      }

      const deleted = await db.billingPlan.delete({
        where: { id: input.id },
      });
      await PlanService.invalidatePlanCache(input.id);
      return deleted;
    }),
});
