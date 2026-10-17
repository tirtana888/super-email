import { env } from "~/env";
import { db } from "~/server/db";
import { logger } from "~/server/logger/log";
import { TeamService } from "~/server/service/team-service";
import { PlanService } from "~/server/service/plan-service";
import { calculateRenewalPeriod } from "~/lib/plan-lifecycle";

interface CreateInvoiceParams {
  teamId: number;
  planId: string;
  userEmail: string;
}

interface XenditInvoiceResponse {
  id: string;
  external_id: string;
  user_id: string;
  status: string;
  merchant_name: string;
  amount: number;
  payer_email: string;
  description: string;
  invoice_url: string;
  expiry_date: string;
}

export async function createXenditInvoice({
  teamId,
  planId,
  userEmail,
}: CreateInvoiceParams) {
  if (!env.XENDIT_SECRET_KEY) {
    throw new Error("XENDIT_SECRET_KEY belum dikonfigurasi.");
  }

  const team = await db.team.findUnique({
    where: { id: teamId },
  });

  if (!team) {
    throw new Error("Tim tidak ditemukan.");
  }

  const plan = await db.billingPlan.findUnique({
    where: { id: planId },
  });

  if (!plan) {
    throw new Error("Paket langganan tidak ditemukan.");
  }

  if (!plan.isActive) {
    throw new Error("Paket ini sedang tidak aktif.");
  }

  if (plan.isDefault || plan.priceIdr <= 0) {
    throw new Error("Paket gratis tidak perlu dibayar.");
  }

  const externalId = `sub_${teamId}_${plan.id}_${Date.now()}`;
  const authHeader = `Basic ${Buffer.from(`${env.XENDIT_SECRET_KEY}:`).toString("base64")}`;

  const payload = {
    external_id: externalId,
    amount: plan.priceIdr,
    payer_email: userEmail || team.billingEmail || undefined,
    description: `Langganan Paket ${plan.name} (${plan.intervalMonths} Bulan)`,
    invoice_duration: 86400, // 24 jam
    currency: "IDR",
    success_redirect_url: `${env.NEXTAUTH_URL}/settings/billing?status=success`,
    failure_redirect_url: `${env.NEXTAUTH_URL}/settings/billing?status=failed`,
    metadata: {
      teamId: teamId.toString(),
      planId: plan.id,
    },
  };

  const response = await fetch("https://api.xendit.co/v2/invoices", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    logger.error({ errorBody }, "[Xendit] Gagal membuat invoice");
    throw new Error(`Gagal membuat invoice Xendit: ${response.statusText}`);
  }

  const data = (await response.json()) as XenditInvoiceResponse;
  return data;
}

export interface XenditWebhookPayload {
  id: string;
  external_id: string;
  status: string;
  amount: number;
  paid_amount?: number;
  paid_at?: string;
  payment_method?: string;
  payment_channel?: string;
  metadata?: {
    teamId?: string;
    planId?: string;
  };
}

export async function processXenditInvoicePaid(payload: XenditWebhookPayload) {
  let teamId: number | undefined;
  let planId: string | undefined;

  if (payload.metadata?.teamId && payload.metadata?.planId) {
    teamId = parseInt(payload.metadata.teamId, 10);
    planId = payload.metadata.planId;
  } else if (payload.external_id) {
    // Format: sub_{teamId}_{planId}_{timestamp}
    const parts = payload.external_id.split("_");
    if (parts.length >= 3 && parts[1] && parts[2]) {
      teamId = parseInt(parts[1], 10);
      planId = parts[2];
    }
  }

  if (!teamId || !planId) {
    logger.error(
      { payload },
      "[Xendit Webhook] Metadata teamId atau planId tidak ditemukan",
    );
    throw new Error("Metadata teamId atau planId tidak valid");
  }

  const team = await db.team.findUnique({
    where: { id: teamId },
  });

  if (!team) {
    throw new Error(`Team dengan ID ${teamId} tidak ditemukan`);
  }

  const plan = await db.billingPlan.findUnique({
    where: { id: planId },
  });

  if (!plan) {
    throw new Error(`Plan dengan ID ${planId} tidak ditemukan`);
  }

  // Xendit can deliver the same paid invoice more than once; each invoice may only count once.
  const alreadyProcessed = await db.subscription.findUnique({
    where: { id: payload.id },
    select: { id: true },
  });

  if (alreadyProcessed) {
    logger.info(
      { teamId, invoiceId: payload.id },
      "[Xendit Webhook] Invoice sudah diproses, dilewati",
    );
    return;
  }

  // Renewing the plan that is still running adds time on top of what is left.
  const currentSubscription = await PlanService.getCurrentSubscription(teamId);
  const renewsSamePlan = currentSubscription?.priceId === plan.id;

  const { start: currentPeriodStart, end: currentPeriodEnd } =
    calculateRenewalPeriod({
      now: new Date(),
      intervalMonths: plan.intervalMonths,
      currentPeriodEnd: renewsSamePlan
        ? currentSubscription?.currentPeriodEnd
        : null,
    });

  const paymentMethodName =
    payload.payment_channel || payload.payment_method || "XENDIT";

  // The team's limits follow billingPlanId; team.plan is kept in sync for older code paths.
  await db.$transaction([
    db.team.update({
      where: { id: teamId },
      data: {
        billingPlanId: plan.id,
        plan: "BASIC",
        isActive: true,
      },
    }),
    db.subscription.create({
      data: {
        id: payload.id,
        teamId: team.id,
        status: "active",
        priceId: plan.id,
        priceIds: [plan.id],
        currentPeriodStart,
        currentPeriodEnd,
        paymentMethod: paymentMethodName,
      },
    }),
  ]);
  await TeamService.refreshTeamCache(teamId);

  logger.info(
    { teamId, planName: plan.name, invoiceId: payload.id },
    "[Xendit Webhook] Berhasil mengaktifkan langganan",
  );
}
