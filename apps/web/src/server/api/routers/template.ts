import { Prisma } from "@prisma/client";
import { extractTemplateVariables } from "~/lib/template-variables";
import { TRPCError } from "@trpc/server";
import { EmailRenderer } from "@usesend/email-editor/src/renderer";
import { z } from "zod";
import { env } from "~/env";
import {
  teamProcedure,
  createTRPCRouter,
  templateProcedure,
} from "~/server/api/trpc";
import { nanoid } from "~/server/nanoid";
import {
  getDocumentUploadUrl,
  isStorageConfigured,
} from "~/server/service/storage-service";

export const templateRouter = createTRPCRouter({
  getTemplates: teamProcedure
    .input(
      z.object({
        page: z.number().optional(),
        search: z.string().trim().max(200).optional().nullable(),
        // The grid view shows a preview, so only it asks for the saved HTML.
        withHtml: z.boolean().optional(),
      }),
    )
    .query(async ({ ctx: { db, team }, input }) => {
      const page = input.page || 1;
      const limit = 30;
      const offset = (page - 1) * limit;

      const whereConditions: Prisma.TemplateFindManyArgs["where"] = {
        teamId: team.id,
        ...(input.search
          ? {
              OR: [
                { name: { contains: input.search, mode: "insensitive" } },
                { subject: { contains: input.search, mode: "insensitive" } },
                { id: input.search },
              ],
            }
          : {}),
      };

      const countP = db.template.count({ where: whereConditions });

      const templatesP = db.template.findMany({
        where: whereConditions,
        select: {
          id: true,
          name: true,
          subject: true,
          createdAt: true,
          updatedAt: true,
          html: true,
        },
        // Most recently edited first: the template someone is working on.
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        skip: offset,
        take: limit,
      });

      const [templates, count] = await Promise.all([templatesP, countP]);

      return {
        templates: templates.map(({ html, ...template }) => ({
          ...template,
          variables: extractTemplateVariables(template.subject, html),
          html: input.withHtml ? html : null,
        })),
        totalPage: Math.ceil(count / limit),
        total: count,
      };
    }),

  createTemplate: teamProcedure
    .input(
      z.object({
        name: z.string(),
        subject: z.string(),
      }),
    )
    .mutation(async ({ ctx: { db, team }, input }) => {
      const template = await db.template.create({
        data: {
          ...input,
          teamId: team.id,
        },
      });

      return template;
    }),

  updateTemplate: templateProcedure
    .input(
      z.object({
        name: z.string().optional(),
        subject: z.string().optional(),
        content: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx: { db }, input }) => {
      const { templateId, ...data } = input;
      let html: string | null = null;

      if (data.content) {
        const jsonContent = data.content ? JSON.parse(data.content) : null;

        const renderer = new EmailRenderer(jsonContent);
        html = await renderer.render();
      }

      const template = await db.template.update({
        where: { id: templateId },
        data: {
          ...data,
          html,
        },
      });
      return template;
    }),

  deleteTemplate: templateProcedure.mutation(
    async ({ ctx: { db, team }, input }) => {
      const template = await db.template.delete({
        where: { id: input.templateId, teamId: team.id },
      });
      return template;
    },
  ),

  getTemplate: templateProcedure.query(async ({ ctx: { db, team }, input }) => {
    const template = await db.template.findUnique({
      where: { id: input.templateId, teamId: team.id },
    });

    if (!template) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Template not found",
      });
    }

    const imageUploadSupported = isStorageConfigured();

    return {
      ...template,
      imageUploadSupported,
    };
  }),

  duplicateTemplate: templateProcedure.mutation(
    async ({ ctx: { db, team, template }, input }) => {
      const newTemplate = await db.template.create({
        data: {
          name: `${template.name} (Copy)`,
          subject: template.subject,
          content: template.content,
          teamId: team.id,
        },
      });

      return newTemplate;
    },
  ),

  generateImagePresignedUrl: templateProcedure
    .input(
      z.object({
        name: z.string(),
        type: z.string(),
      }),
    )
    .mutation(async ({ ctx: { team }, input }) => {
      const extension = input.name.split(".").pop();
      const randomName = `${nanoid()}.${extension}`;

      const url = await getDocumentUploadUrl(
        `${team.id}/${randomName}`,
        input.type,
      );

      const imageUrl = `${env.S3_COMPATIBLE_PUBLIC_URL}/${team.id}/${randomName}`;

      return { uploadUrl: url, imageUrl };
    }),
});
