import type { Prisma } from "@prisma/client";
import { buildAdminUserRow, type AdminUserRow } from "~/lib/admin-users";
import { db } from "../db";

export const ADMIN_USER_FILTERS = [
  "all",
  "paid",
  "free",
  "blocked",
  "waitlisted",
] as const;

export type AdminUserFilter = (typeof ADMIN_USER_FILTERS)[number];

const EXPORT_LIMIT = 10_000;

// A team counts as paid when it is on a non-default catalog plan or has the legacy BASIC flag.
const paidTeam: Prisma.TeamWhereInput = {
  OR: [{ plan: "BASIC" }, { billingPlan: { is: { isDefault: false } } }],
};

function buildWhere(search: string | undefined, filter: AdminUserFilter) {
  const and: Prisma.UserWhereInput[] = [];

  if (search) {
    and.push({
      OR: [
        { email: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
        {
          teamUsers: {
            some: { team: { name: { contains: search, mode: "insensitive" } } },
          },
        },
      ],
    });
  }

  if (filter === "paid") {
    and.push({ teamUsers: { some: { team: paidTeam } } });
  } else if (filter === "free") {
    and.push({ NOT: { teamUsers: { some: { team: paidTeam } } } });
  } else if (filter === "blocked") {
    and.push({ teamUsers: { some: { team: { isBlocked: true } } } });
  } else if (filter === "waitlisted") {
    and.push({ isWaitlisted: true });
  }

  return and.length > 0 ? { AND: and } : {};
}

const userSelect = {
  id: true,
  email: true,
  name: true,
  createdAt: true,
  isWaitlisted: true,
  teamUsers: {
    select: {
      role: true,
      team: {
        select: {
          id: true,
          name: true,
          plan: true,
          isBlocked: true,
          billingPlan: { select: { name: true, isDefault: true } },
          _count: { select: { domains: true } },
        },
      },
    },
  },
} satisfies Prisma.UserSelect;

async function sentThisMonthByTeam(teamIds: number[]) {
  if (teamIds.length === 0) {
    return new Map<number, number>();
  }

  const now = new Date();
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  )
    .toISOString()
    .slice(0, 10);

  const totals = await db.dailyEmailUsage.groupBy({
    by: ["teamId"],
    where: { teamId: { in: teamIds }, date: { gte: monthStart } },
    _sum: { sent: true },
  });

  return new Map(totals.map((row) => [row.teamId, row._sum.sent ?? 0]));
}

async function toRows(
  users: Array<Prisma.UserGetPayload<{ select: typeof userSelect }>>,
): Promise<AdminUserRow[]> {
  const teamIds = [
    ...new Set(users.flatMap((user) => user.teamUsers.map((tu) => tu.team.id))),
  ];
  const sentByTeam = await sentThisMonthByTeam(teamIds);

  return users.map((user) => buildAdminUserRow(user, sentByTeam));
}

export class AdminUserService {
  static async list(input: {
    page: number;
    pageSize: number;
    search?: string;
    filter: AdminUserFilter;
  }) {
    const where = buildWhere(input.search, input.filter);

    const [total, users] = await Promise.all([
      db.user.count({ where }),
      db.user.findMany({
        where,
        select: userSelect,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
      }),
    ]);

    return {
      items: await toRows(users),
      total,
      page: input.page,
      pageSize: input.pageSize,
    };
  }

  static async exportAll(input: { search?: string; filter: AdminUserFilter }) {
    const users = await db.user.findMany({
      where: buildWhere(input.search, input.filter),
      select: userSelect,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: EXPORT_LIMIT,
    });

    return { items: await toRows(users), truncated: users.length === EXPORT_LIMIT };
  }
}
