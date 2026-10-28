import { WebhookStatus } from "@prisma/client";
import { StatusDot, type StatusTone } from "@usesend/ui/src/status-dot";

export function WebhookStatusBadge({ status }: { status: WebhookStatus }) {
  let tone: StatusTone = "neutral";
  let label: string = status;

  if (status === WebhookStatus.ACTIVE) {
    tone = "ok";
    label = "Active";
  } else if (status === WebhookStatus.PAUSED) {
    tone = "warn";
    label = "Paused";
  } else if (status === WebhookStatus.AUTO_DISABLED) {
    tone = "bad";
    label = "Auto disabled";
  }

  return <StatusDot tone={tone}>{label}</StatusDot>;
}
