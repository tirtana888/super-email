import { describe, expect, it } from "vitest";
import {
  ADMIN_USER_CSV_HEADER,
  adminUserToCsvRow,
  buildAdminUserRow,
  csvCell,
  describeTeamPlan,
  toCsv,
} from "./admin-users";

describe("describeTeamPlan", () => {
  it("shows the catalog plan name for a paid plan", () => {
    expect(
      describeTeamPlan({
        plan: "BASIC",
        billingPlan: { name: "Pro", isDefault: false },
      }),
    ).toEqual({ label: "Pro", paid: true });
  });

  it("lets a catalog plan win over the legacy BASIC flag", () => {
    expect(
      describeTeamPlan({
        plan: "FREE",
        billingPlan: { name: "Dev", isDefault: false },
      }),
    ).toEqual({ label: "Dev", paid: true });
  });

  it("marks the legacy BASIC flag on the default plan as unlimited", () => {
    expect(
      describeTeamPlan({
        plan: "BASIC",
        billingPlan: { name: "Free", isDefault: true },
      }),
    ).toEqual({ label: "Unlimited (legacy)", paid: true });
    expect(describeTeamPlan({ plan: "BASIC", billingPlan: null })).toEqual({
      label: "Unlimited (legacy)",
      paid: true,
    });
  });

  it("is free for the default plan or no plan", () => {
    expect(
      describeTeamPlan({
        plan: "FREE",
        billingPlan: { name: "Free", isDefault: true },
      }),
    ).toEqual({ label: "Free", paid: false });
    expect(describeTeamPlan({ plan: "FREE", billingPlan: null })).toEqual({
      label: "Free",
      paid: false,
    });
  });
});

describe("csvCell", () => {
  it("leaves plain values alone", () => {
    expect(csvCell("hello")).toBe("hello");
    expect(csvCell(12)).toBe("12");
    expect(csvCell(null)).toBe("");
    expect(csvCell(undefined)).toBe("");
  });

  it("quotes values with commas, quotes or newlines", () => {
    expect(csvCell("a,b")).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell("line1\nline2")).toBe('"line1\nline2"');
  });

  it("neutralises values that a spreadsheet would run as a formula", () => {
    expect(csvCell("=HYPERLINK(\"http://evil\")")).toBe(
      '"\'=HYPERLINK(""http://evil"")"',
    );
    expect(csvCell("+1555")).toBe("'+1555");
    expect(csvCell("-cmd")).toBe("'-cmd");
    expect(csvCell("@SUM(A1)")).toBe("'@SUM(A1)");
  });

  it("keeps real negative numbers as numbers", () => {
    expect(csvCell(-5)).toBe("-5");
  });
});

describe("buildAdminUserRow and CSV row", () => {
  const user = {
    id: 7,
    email: "owner@example.com",
    name: "Owner, The",
    createdAt: new Date("2026-10-18T08:00:00.000Z"),
    isWaitlisted: false,
    teamUsers: [
      {
        role: "ADMIN",
        team: {
          id: 4,
          name: "Nusadaya Academy",
          plan: "BASIC" as const,
          billingPlan: { name: "Pro", isDefault: false },
          isBlocked: false,
          _count: { domains: 2 },
        },
      },
      {
        role: "MEMBER",
        team: {
          id: 9,
          name: "Side Project",
          plan: "FREE" as const,
          billingPlan: null,
          isBlocked: true,
          _count: { domains: 1 },
        },
      },
    ],
  };

  it("adds the plan label and this month's volume to each team", () => {
    const row = buildAdminUserRow(user, new Map([[4, 1200]]));

    expect(row.teams).toEqual([
      {
        id: 4,
        name: "Nusadaya Academy",
        role: "ADMIN",
        planLabel: "Pro",
        paid: true,
        isBlocked: false,
        domains: 2,
        sentThisMonth: 1200,
      },
      {
        id: 9,
        name: "Side Project",
        role: "MEMBER",
        planLabel: "Free",
        paid: false,
        isBlocked: true,
        domains: 1,
        sentThisMonth: 0,
      },
    ]);
  });

  it("flattens a user into one CSV row that matches the header", () => {
    const csvRow = adminUserToCsvRow(buildAdminUserRow(user, new Map([[4, 1200]])));

    expect(csvRow).toHaveLength(ADMIN_USER_CSV_HEADER.length);
    expect(toCsv([[...ADMIN_USER_CSV_HEADER], csvRow])).toBe(
      [
        "ID,Email,Name,Joined,Waitlisted,Teams,Plans,Domains,Emails sent this month,Blocked",
        '7,owner@example.com,"Owner, The",2026-10-18,no,Nusadaya Academy | Side Project,Pro | Free,3,1200,yes',
      ].join("\r\n"),
    );
  });
});
