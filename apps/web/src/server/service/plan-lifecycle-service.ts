import { env } from "~/env";
import { getPeriodState, getReminderKind, type ReminderKind } from "~/lib/plan-lifecycle";
import { buildPlanLifecycleEmail } from "~/lib/plan-lifecycle-email";
import { db } from "../db";
import { logger } from "../logger/log";
import { sendMail } from "../mailer";
import { getRedis, redisKey } from "../redis";
import { toPlainHtml } from "../utils/email-content";
import { PlanService } from "./plan-service";
import { TeamService } from "./team-service";

const REMINDER_TTL_SECONDS = 14 * 24 * 60 * 60;
const SUPPORT_EMAIL = "support@f14.dev";

type SweepTeam = {
  id: number;
  name: string;
  billingEmail: string | null;
  billingPlan: { name: string } | null;
};

async function getRecipients(team: SweepTeam) {
  const teamUsers = await TeamService.getTeamUsers(team.id);
  const emails = teamUsers
    .filter((teamUser) => teamUser.role === "ADMIN")
    .map((teamUser) => teamUser.user?.email)
    .concat(team.billingEmail)
    .filter((email): email is string => Boolean(email))
    .map((email) => email.toLowerCase());

  return [...new Set(emails)];
}

/** Returns true the first time it is called for this team, period and kind. */
async function claimReminder(teamId: number, periodEnd: Date, kind: ReminderKind) {
  const key = redisKey(`plan-reminder:${teamId}:${periodEnd.getTime()}:${kind}`);
  const result = await getRedis().set(key, "1", "EX", REMINDER_TTL_SECONDS, "NX");

  return result === "OK";
}

async function notify(
  team: SweepTeam,
  kind: ReminderKind,
  periodEnd: Date,
  now: Date,
) {
  const { subject, text } = buildPlanLifecycleEmail(kind, {
    teamName: team.name,
    planName: team.billingPlan?.name ?? "berbayar",
    periodEnd,
    now,
    billingUrl: `${env.NEXTAUTH_URL}/settings/billing`,
  });

  const recipients = await getRecipients(team);

  await Promise.all(
    recipients.map((to) =>
      sendMail(to, subject, text, toPlainHtml(text), SUPPORT_EMAIL).catch(
        (err) =>
          logger.warn(
            { err, teamId: team.id, kind },
            "[PlanLifecycle]: Failed to send notification email",
          ),
      ),
    ),
  );
}

async function downgradeToDefaultPlan(team: SweepTeam, defaultPlanId: string) {
  await TeamService.updateTeam(team.id, {
    billingPlan: { connect: { id: defaultPlanId } },
    plan: "FREE",
    isActive: true,
  });

  await db.subscription.updateMany({
    where: { teamId: team.id, status: "active" },
    data: { status: "expired" },
  });
}

/**
 * Sends expiry reminders and moves teams back to the default plan once the grace
 * period after a paid period has passed. Teams without any subscription (for example a
 * plan assigned by an admin) are never touched.
 */
export async function sweepPlanLifecycle(now: Date = new Date()) {
  const defaultPlan = await PlanService.getDefaultPlan();

  if (!defaultPlan) {
    logger.warn("[PlanLifecycle]: No default plan found; skipping sweep");
    return { downgraded: 0, reminders: 0 };
  }

  const teams = await db.team.findMany({
    where: { billingPlan: { is: { isDefault: false } } },
    select: {
      id: true,
      name: true,
      billingEmail: true,
      billingPlan: { select: { name: true } },
    },
  });

  let downgraded = 0;
  let reminders = 0;

  for (const team of teams) {
    try {
      const subscription = await PlanService.getCurrentSubscription(team.id);
      const periodEnd = subscription?.currentPeriodEnd;

      if (!periodEnd) {
        continue;
      }

      const kind = getReminderKind(periodEnd, now);

      if (getPeriodState(periodEnd, now) === "expired") {
        await downgradeToDefaultPlan(team, defaultPlan.id);
        downgraded += 1;
        await notify(team, "downgraded", periodEnd, now);
        continue;
      }

      if (kind && (await claimReminder(team.id, periodEnd, kind))) {
        await notify(team, kind, periodEnd, now);
        reminders += 1;
      }
    } catch (err) {
      logger.error(
        { err, teamId: team.id },
        "[PlanLifecycle]: Failed to process team",
      );
    }
  }

  logger.info({ downgraded, reminders }, "[PlanLifecycle]: Sweep finished");

  return { downgraded, reminders };
}
