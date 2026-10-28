import * as React from "react";

import { cn } from "../lib/utils";

export type StatusTone =
  | "ok"
  | "bad"
  | "warn"
  | "info"
  | "pending"
  | "neutral";

const dotClass: Record<StatusTone, string> = {
  ok: "bg-green",
  bad: "bg-red",
  warn: "bg-yellow",
  info: "bg-blue",
  // Hollow ring: a state that has not happened yet (scheduled, draft, pending).
  pending: "bg-transparent ring-[1.5px] ring-inset ring-gray",
  neutral: "bg-gray",
};

/**
 * A status shown as a small coloured dot followed by its label. Colour stays in
 * the dot so tables remain calm and failures stand out.
 */
export function StatusDot({
  tone,
  children,
  className,
}: {
  tone: StatusTone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 whitespace-nowrap text-[13px] text-foreground",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn("h-[7px] w-[7px] shrink-0 rounded-full", dotClass[tone])}
      />
      {children}
    </span>
  );
}
