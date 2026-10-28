import { EmailStatus } from "@prisma/client";
import { StatusDot, type StatusTone } from "@usesend/ui/src/status-dot";

function statusTone(status: EmailStatus | string): StatusTone {
  switch (status) {
    case "DELIVERED":
      return "ok";
    case "BOUNCED":
    case "FAILED":
    case "REJECTED":
    case "RENDERING_FAILURE":
      return "bad";
    case "COMPLAINED":
    case "DELIVERY_DELAYED":
    case "SUPPRESSED":
      return "warn";
    case "OPENED":
    case "CLICKED":
      return "info";
    case "SCHEDULED":
      return "pending";
    default:
      return "neutral";
  }
}

const iconDotClass: Record<StatusTone, string> = {
  ok: "bg-green",
  bad: "bg-red",
  warn: "bg-yellow",
  info: "bg-blue",
  pending: "bg-transparent ring-[1.5px] ring-inset ring-gray",
  neutral: "bg-gray",
};

function statusLabel(status: EmailStatus | string) {
  const label = status.toLowerCase().split("_").join(" ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export const EmailStatusBadge: React.FC<{ status: EmailStatus | string }> = ({
  status,
}) => {
  return <StatusDot tone={statusTone(status)}>{statusLabel(status)}</StatusDot>;
};

export const EmailStatusIcon: React.FC<{ status: EmailStatus }> = ({
  status,
}) => {
  return (
    <div className="flex h-5 w-5 items-center justify-center">
      <div
        className={`h-2.5 w-2.5 rounded-full ${iconDotClass[statusTone(status)]}`}
      ></div>
    </div>
  );
};
