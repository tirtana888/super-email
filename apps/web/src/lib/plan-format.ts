export function formatPlanLimit(value: number, unit: string) {
  return value === -1
    ? "Tanpa batas"
    : `${value.toLocaleString("id-ID")} ${unit}`;
}

export function formatIdr(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export type PlanLimitRow = { label: string; value: string };

export function describePlanLimits(limits: {
  emailsPerMonth: number;
  emailsPerDay: number;
  domains: number;
  teamMembers: number;
  contactBooks: number;
  webhooks: number;
}): PlanLimitRow[] {
  return [
    { label: "Email per bulan", value: formatPlanLimit(limits.emailsPerMonth, "email") },
    { label: "Email per hari", value: formatPlanLimit(limits.emailsPerDay, "email") },
    { label: "Domain pengirim", value: formatPlanLimit(limits.domains, "domain") },
    { label: "Anggota tim", value: formatPlanLimit(limits.teamMembers, "anggota") },
    { label: "Contact book", value: formatPlanLimit(limits.contactBooks, "buku") },
    { label: "Webhook", value: formatPlanLimit(limits.webhooks, "webhook") },
  ];
}
