import { DomainStatus } from "@prisma/client";
import { StatusDot, type StatusTone } from "@usesend/ui/src/status-dot";

export function domainStatusTone(status: DomainStatus): StatusTone {
  switch (status) {
    case DomainStatus.SUCCESS:
      return "ok";
    case DomainStatus.FAILED:
      return "bad";
    case DomainStatus.TEMPORARY_FAILURE:
      return "warn";
    case DomainStatus.PENDING:
    case DomainStatus.NOT_STARTED:
      return "pending";
    default:
      return "neutral";
  }
}

export function domainStatusLabel(status: DomainStatus) {
  if (status === DomainStatus.SUCCESS) {
    return "Verified";
  }
  const label = status.split("_").join(" ").toLowerCase();
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export const DomainStatusBadge: React.FC<{ status: DomainStatus }> = ({
  status,
}) => {
  return (
    <StatusDot tone={domainStatusTone(status)}>
      {domainStatusLabel(status)}
    </StatusDot>
  );
};
