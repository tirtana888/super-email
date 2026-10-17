import {
  GRACE_PERIOD_DAYS,
  daysUntil,
  getGraceEnd,
  type ReminderKind,
} from "./plan-lifecycle";

function formatDate(date: Date) {
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });
}

export function buildPlanLifecycleEmail(
  kind: ReminderKind,
  input: {
    teamName: string;
    planName: string;
    periodEnd: Date;
    now: Date;
    billingUrl: string;
  },
): { subject: string; text: string } {
  const { teamName, planName, periodEnd, now, billingUrl } = input;
  const greeting = `Halo tim ${teamName},`;
  const endDate = formatDate(periodEnd);
  const graceEndDate = formatDate(getGraceEnd(periodEnd));

  if (kind === "expiring") {
    const days = Math.max(daysUntil(periodEnd, now), 1);

    return {
      subject: `F14: Paket ${planName} berakhir dalam ${days} hari`,
      text: [
        greeting,
        "",
        `Paket ${planName} tim kamu akan berakhir pada ${endDate}.`,
        "Perpanjang sebelum tanggal itu supaya pengiriman email tidak terganggu. Sisa hari paket yang sedang berjalan tetap dihitung saat kamu memperpanjang.",
        `Setelah paket berakhir ada masa tenggang ${GRACE_PERIOD_DAYS} hari, lalu tim otomatis kembali ke paket Free.`,
        "",
        `Perpanjang paket: ${billingUrl}`,
        "",
        "Salam,",
        "F14 Team",
      ].join("\n"),
    };
  }

  if (kind === "grace") {
    return {
      subject: `F14: Paket ${planName} sudah berakhir, masa tenggang berjalan`,
      text: [
        greeting,
        "",
        `Paket ${planName} tim kamu berakhir pada ${endDate}.`,
        `Pengiriman email masih berjalan sampai ${graceEndDate}. Setelah itu tim otomatis kembali ke paket Free dengan batas yang lebih kecil.`,
        "",
        `Perpanjang paket: ${billingUrl}`,
        "",
        "Salam,",
        "F14 Team",
      ].join("\n"),
    };
  }

  return {
    subject: "F14: Tim kamu sekarang memakai paket Free",
    text: [
      greeting,
      "",
      `Paket ${planName} berakhir pada ${endDate} dan masa tenggang ${GRACE_PERIOD_DAYS} hari sudah lewat, jadi tim kamu sekarang memakai paket Free.`,
      "Data dan domain kamu tidak dihapus. Pengiriman mengikuti batas paket Free sampai kamu berlangganan lagi.",
      "",
      `Pilih paket: ${billingUrl}`,
      "",
      "Salam,",
      "F14 Team",
    ].join("\n"),
  };
}
