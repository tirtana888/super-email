import { WebhookCallStatus } from "@prisma/client";
import { StatusDot, type StatusTone } from "@usesend/ui/src/status-dot";

const callStatus: Record<WebhookCallStatus, { tone: StatusTone; label: string }> =
  {
    [WebhookCallStatus.DELIVERED]: { tone: "ok", label: "Delivered" },
    [WebhookCallStatus.FAILED]: { tone: "bad", label: "Failed" },
    [WebhookCallStatus.PENDING]: { tone: "pending", label: "Pending" },
    [WebhookCallStatus.IN_PROGRESS]: { tone: "info", label: "In progress" },
    [WebhookCallStatus.DISCARDED]: { tone: "neutral", label: "Discarded" },
  };

export function WebhookCallStatusBadge({
  status,
}: {
  status: WebhookCallStatus;
}) {
  const { tone, label } = callStatus[status] ?? {
    tone: "neutral" as const,
    label: status,
  };

  return <StatusDot tone={tone}>{label}</StatusDot>;
}
