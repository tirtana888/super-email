import { env } from "~/env";
import type { OnboardingInput } from "~/lib/onboarding";
import { ONBOARDING_COPY } from "~/lib/onboarding-copy";
import { logger } from "~/server/logger/log";
import { sendMail } from "~/server/mailer";
import { escapeHtml } from "~/server/utils/email-content";

/**
 * Tells the founder about a new sign-up. It never blocks or fails the sign-up itself.
 */
export async function notifyFounderOfOnboarding({
  user,
  teamName,
  answers,
}: {
  user: { id: number; email?: string | null };
  teamName: string;
  answers: OnboardingInput;
}) {
  const founderEmail = env.FOUNDER_EMAIL ?? env.ADMIN_EMAIL;

  if (!founderEmail) {
    logger.warn("FOUNDER_EMAIL/ADMIN_EMAIL is not set; skipping onboarding notification");
    return;
  }

  // The founder reads English labels regardless of the language the user chose.
  const copy = ONBOARDING_COPY.en;
  const volume = copy.monthlyVolume.options[answers.monthlyVolume];
  const emailTypes = answers.emailTypes
    .map((type) => copy.emailTypes.options[type])
    .join(", ");
  const useCases = answers.useCases
    .map((useCase) => copy.useCases.options[useCase])
    .join(", ");

  const rows: Array<[string, string]> = [
    ["Team", teamName],
    ["Email", user.email ?? "Unknown"],
    ["Domain", answers.domain],
    ["Email types", emailTypes],
    ["Expected volume / month", volume],
    ["Use cases", useCases],
    ["Other use case", answers.otherUseCase ?? "-"],
    ["Language", answers.language],
  ];

  const subject = `F14: new sign-up - ${teamName}`;
  const text = [
    "A new team just signed up and was placed on the Free plan.",
    "",
    ...rows.map(([label, value]) => `${label}: ${value}`),
  ].join("\n");
  const html = `<p>A new team just signed up and was placed on the Free plan.</p><ul>${rows
    .map(
      ([label, value]) =>
        `<li><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</li>`,
    )
    .join("")}</ul>`;

  try {
    await sendMail(founderEmail, subject, text, html, user.email ?? undefined);
  } catch (err) {
    logger.warn({ err }, "Could not send onboarding notification email");
  }
}
