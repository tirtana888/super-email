import { EmailStatus } from "@prisma/client";

// Theme tokens, so light and dark mode follow the palette in packages/ui.
export const EMAIL_COLORS: Record<EmailStatus | "total", string> = {
  total: "bg-gray",
  DELIVERED: "bg-green",
  BOUNCED: "bg-red",
  FAILED: "bg-red",
  CLICKED: "bg-blue",
  OPENED: "bg-purple",
  COMPLAINED: "bg-yellow",
  DELIVERY_DELAYED: "bg-yellow",
  SENT: "bg-gray/40",
  SCHEDULED: "bg-gray/40",
  QUEUED: "bg-gray/40",
  REJECTED: "bg-red",
  RENDERING_FAILURE: "bg-red",
  CANCELLED: "bg-gray/40",
  SUPPRESSED: "bg-gray/40",
};
