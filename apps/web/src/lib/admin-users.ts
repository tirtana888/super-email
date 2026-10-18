import { describeTeamPlan, type TeamPlanSource } from "./plan-label";

// The plan label lives in one place so the user list and the team page always agree.
export { describeTeamPlan };
export type { TeamPlanSource };

export type AdminUserTeam = {
  id: number;
  name: string;
  role: string;
  planLabel: string;
  paid: boolean;
  isBlocked: boolean;
  domains: number;
  sentThisMonth: number;
};

export type AdminUserRow = {
  id: number;
  email: string | null;
  name: string | null;
  createdAt: Date;
  isWaitlisted: boolean;
  teams: AdminUserTeam[];
};

type UserRecord = {
  id: number;
  email: string | null;
  name: string | null;
  createdAt: Date;
  isWaitlisted: boolean;
  teamUsers: Array<{
    role: string;
    team: TeamPlanSource & {
      id: number;
      name: string;
      isBlocked: boolean;
      _count: { domains: number };
    };
  }>;
};

export function buildAdminUserRow(
  user: UserRecord,
  sentByTeam: Map<number, number>,
): AdminUserRow {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
    isWaitlisted: user.isWaitlisted,
    teams: user.teamUsers.map(({ role, team }) => {
      const { label, paid } = describeTeamPlan(team);

      return {
        id: team.id,
        name: team.name,
        role,
        planLabel: label,
        paid,
        isBlocked: team.isBlocked,
        domains: team._count.domains,
        sentThisMonth: sentByTeam.get(team.id) ?? 0,
      };
    }),
  };
}

/**
 * Values that start with these characters are read as formulas by spreadsheet apps. Names and
 * team names are typed by users, so they get a leading apostrophe in exports.
 */
const FORMULA_START = /^[=+\-@\t\r]/;

export function csvCell(value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  const safe = FORMULA_START.test(value) ? `'${value}` : value;

  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(
  rows: Array<Array<string | number | boolean | null | undefined>>,
): string {
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}

export const ADMIN_USER_CSV_HEADER = [
  "ID",
  "Email",
  "Name",
  "Joined",
  "Waitlisted",
  "Teams",
  "Plans",
  "Domains",
  "Emails sent this month",
  "Blocked",
] as const;

export function adminUserToCsvRow(user: AdminUserRow) {
  return [
    user.id,
    user.email,
    user.name,
    user.createdAt.toISOString().slice(0, 10),
    user.isWaitlisted ? "yes" : "no",
    user.teams.map((team) => team.name).join(" | "),
    user.teams.map((team) => team.planLabel).join(" | "),
    user.teams.reduce((sum, team) => sum + team.domains, 0),
    user.teams.reduce((sum, team) => sum + team.sentThisMonth, 0),
    user.teams.some((team) => team.isBlocked) ? "yes" : "no",
  ];
}
