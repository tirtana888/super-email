import { CampaignStatus } from "@prisma/client";
import { StatusDot, type StatusTone } from "@usesend/ui/src/status-dot";

interface CampaignStatusBadgeProps {
  status: CampaignStatus;
}

function campaignTone(status: CampaignStatus): StatusTone {
  switch (status) {
    case CampaignStatus.SENT:
      return "ok";
    case CampaignStatus.RUNNING:
      return "info";
    case CampaignStatus.PAUSED:
      return "warn";
    case CampaignStatus.DRAFT:
    case CampaignStatus.SCHEDULED:
      return "pending";
    default:
      return "neutral";
  }
}

export default function CampaignStatusBadge({
  status,
}: CampaignStatusBadgeProps) {
  const label = status.toLowerCase();

  return (
    <StatusDot tone={campaignTone(status)}>
      {label.charAt(0).toUpperCase() + label.slice(1)}
    </StatusDot>
  );
}
