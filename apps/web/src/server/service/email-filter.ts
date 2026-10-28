import { EmailStatus, Prisma } from "@prisma/client";
import { subDays } from "date-fns";
import { z } from "zod";

const statuses = Object.values(EmailStatus) as [EmailStatus];

export const emailFilterInput = z.object({
  status: z.enum(statuses).optional().nullable(),
  domain: z.number().optional(),
  search: z.string().optional().nullable(),
  apiId: z.number().optional(),
  // Only emails created in the last N days. Omitted means all time.
  days: z.number().int().min(1).max(365).optional(),
});

export type EmailFilter = z.infer<typeof emailFilterInput>;

/**
 * The WHERE conditions shared by the list, the export and the status counts,
 * so the three always agree. Pass an alias when the query names the table.
 */
export function emailFilterSql(
  teamId: number,
  input: EmailFilter,
  { alias, includeStatus = true }: { alias?: string; includeStatus?: boolean } = {},
) {
  const col = (name: string) =>
    Prisma.raw(alias ? `${alias}."${name}"` : `"${name}"`);
  const since = input.days ? subDays(new Date(), input.days) : null;

  return Prisma.sql`${col("teamId")} = ${teamId}
        ${includeStatus && input.status ? Prisma.sql`AND ${col("latestStatus")}::text = ${input.status}` : Prisma.empty}
        ${input.domain ? Prisma.sql`AND ${col("domainId")} = ${input.domain}` : Prisma.empty}
        ${input.apiId ? Prisma.sql`AND ${col("apiId")} = ${input.apiId}` : Prisma.empty}
        ${since ? Prisma.sql`AND ${col("createdAt")} >= ${since}` : Prisma.empty}
        ${
          input.search
            ? Prisma.sql`AND (
          ${col("id")} = ${input.search}
          OR ${col("subject")} ILIKE ${`%${input.search}%`}
          OR EXISTS (
            SELECT 1 FROM unnest(${col("to")}) AS email
            WHERE email ILIKE ${`%${input.search}%`}
          )
        )`
            : Prisma.empty
        }`;
}
