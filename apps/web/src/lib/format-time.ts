// Dashboard times are shown in Western Indonesia Time, the zone most F14
// customers work in, so a time in a table matches the time in their own logs.
export const DISPLAY_TIME_ZONE = "Asia/Jakarta";
export const DISPLAY_TIME_ZONE_LABEL = "WIB";

type Parts = Record<"year" | "month" | "day" | "hour" | "minute" | "second", string>;

function zonedParts(date: Date): Parts {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: DISPLAY_TIME_ZONE,
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const out = {} as Parts;
  for (const part of parts) {
    if (part.type in { year: 1, month: 1, day: 1, hour: 1, minute: 1, second: 1 }) {
      out[part.type as keyof Parts] = part.value;
    }
  }
  return out;
}

/**
 * "28 Oct 10:42:07" for this year, "28 Oct 2025 10:42:07" otherwise.
 * `now` decides what "this year" is, so callers and tests stay deterministic.
 */
export function formatDashboardTime(
  value: Date | string,
  { seconds = true, now = new Date() }: { seconds?: boolean; now?: Date } = {},
) {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const p = zonedParts(date);
  const sameYear = p.year === zonedParts(now).year;
  const time = seconds ? `${p.hour}:${p.minute}:${p.second}` : `${p.hour}:${p.minute}`;

  return `${p.day} ${p.month}${sameYear ? "" : ` ${p.year}`} ${time}`;
}

/** Full timestamp with the zone label, for tooltips and detail views. */
export function formatDashboardTimeLong(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const p = zonedParts(date);
  return `${p.day} ${p.month} ${p.year}, ${p.hour}:${p.minute}:${p.second} ${DISPLAY_TIME_ZONE_LABEL}`;
}

/** "+0.8s", "+12s", "+3m 05s", "+2h 10m" between two events. */
export function formatElapsed(from: Date | string, to: Date | string) {
  const ms = new Date(to).getTime() - new Date(from).getTime();
  if (!Number.isFinite(ms) || ms < 0) {
    return "";
  }
  if (ms < 10_000) {
    return `+${(ms / 1000).toFixed(1)}s`;
  }
  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds < 60) {
    return `+${totalSeconds}s`;
  }
  const minutes = Math.floor(totalSeconds / 60);
  if (minutes < 60) {
    return `+${minutes}m ${String(totalSeconds % 60).padStart(2, "0")}s`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 48) {
    return `+${hours}h ${String(minutes % 60).padStart(2, "0")}m`;
  }
  return `+${Math.floor(hours / 24)}d ${hours % 24}h`;
}
