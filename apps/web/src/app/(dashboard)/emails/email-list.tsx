"use client";

import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@usesend/ui/src/table";
import { api } from "~/trpc/react";
import { Download } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { EmailStatus } from "@prisma/client";
import { EmailStatusBadge } from "./email-status-badge";
import EmailDetails from "./email-details";
import dynamic from "next/dynamic";
import { useUrlState } from "~/hooks/useUrlState";
import { Button } from "@usesend/ui/src/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@usesend/ui/src/select";
import Spinner from "@usesend/ui/src/spinner";
import { Input } from "@usesend/ui/src/input";
import { DEFAULT_QUERY_LIMIT } from "~/lib/constants";
import {
  DISPLAY_TIME_ZONE_LABEL,
  formatDashboardTime,
  formatDashboardTimeLong,
} from "~/lib/format-time";
import { useDebouncedCallback } from "use-debounce";
import { useEffect } from "react";
import { SheetTitle, SheetDescription } from "@usesend/ui/src/sheet";

/* Stupid hydrating error. And I so stupid to understand the stupid NextJS docs */
const DynamicSheetWithNoSSR = dynamic(
  () => import("@usesend/ui/src/sheet").then((mod) => mod.Sheet),
  { ssr: false },
);

const DynamicSheetContentWithNoSSR = dynamic(
  () => import("@usesend/ui/src/sheet").then((mod) => mod.SheetContent),
  { ssr: false },
);

function recipients(to: string | string[] | null | undefined): string[] {
  if (!to) {
    return [];
  }

  return Array.isArray(to) ? to : [to];
}

// The statuses people filter by most get a tab; the rest live under "More".
const STATUS_TABS: Array<{ label: string; value: EmailStatus | null }> = [
  { label: "All", value: null },
  { label: "Delivered", value: "DELIVERED" },
  { label: "Opened", value: "OPENED" },
  { label: "Clicked", value: "CLICKED" },
  { label: "Bounced", value: "BOUNCED" },
  { label: "Complained", value: "COMPLAINED" },
  { label: "Failed", value: "FAILED" },
  { label: "Scheduled", value: "SCHEDULED" },
];

const MORE_STATUSES: EmailStatus[] = [
  "QUEUED",
  "SENT",
  "DELIVERY_DELAYED",
  "REJECTED",
  "RENDERING_FAILURE",
  "SUPPRESSED",
  "CANCELLED",
];

const DATE_RANGES = [
  { value: "1", label: "Last 24 hours" },
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "all", label: "All time" },
] as const;

const DEFAULT_RANGE = "30";

function statusLabel(status: string) {
  const label = status.toLowerCase().split("_").join(" ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
  );
}

export default function EmailsList() {
  const [selectedEmail, setSelectedEmail] = useUrlState("emailId");
  const [page, setPage] = useUrlState("page", "1");
  const [status, setStatus] = useUrlState("status");
  const [search, setSearch] = useUrlState("search");
  const [domain, setDomain] = useUrlState("domain");
  const [apiKey, setApiKey] = useUrlState("apikey");
  const [range, setRange] = useUrlState("days", DEFAULT_RANGE);

  const pageNumber = Number(page);
  const domainId = domain ? Number(domain) : undefined;
  const apiId = apiKey ? Number(apiKey) : undefined;
  const currentStatus = (status?.toUpperCase() as EmailStatus) || null;
  const days = range && range !== "all" ? Number(range) : undefined;

  const filters = {
    domain: domainId,
    search,
    apiId,
    days,
  };

  const emailsQuery = api.email.emails.useQuery({
    ...filters,
    page: pageNumber,
    status: currentStatus,
  });

  const countsQuery = api.email.statusCounts.useQuery(filters, {
    enabled: days !== undefined,
  });
  const counts = days !== undefined ? countsQuery.data : null;
  const totalCount = counts
    ? Object.values(counts).reduce((sum, n) => sum + (n ?? 0), 0)
    : null;

  const exportQuery = api.email.exportEmails.useQuery(
    { ...filters, status: currentStatus },
    { enabled: false },
  );

  const { data: domainsQuery } = api.domain.domains.useQuery();
  const { data: apiKeysQuery } = api.apiKey.getApiKeys.useQuery();

  const emails = emailsQuery.data?.emails ?? [];

  // A filter change starts again from the first page.
  const applyFilter = (set: (value: string | null) => void, value: string | null) => {
    set(value);
    setPage("1");
  };

  const handleSheetChange = (isOpen: boolean) => {
    if (!isOpen) {
      setSelectedEmail(null);
    }
  };

  const debouncedSearch = useDebouncedCallback((value: string) => {
    applyFilter(setSearch, value.trim() || null);
  }, 600);

  // J / K move to the next or previous email while one is open.
  useEffect(() => {
    if (!selectedEmail) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      const key = event.key.toLowerCase();
      if (key !== "j" && key !== "k") return;

      const index = emails.findIndex((email) => email.id === selectedEmail);
      if (index === -1) return;
      const next = emails[key === "j" ? index + 1 : index - 1];
      if (next) {
        event.preventDefault();
        setSelectedEmail(next.id);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedEmail, emails, setSelectedEmail]);

  const apiKeyName = (id: number | null | undefined) =>
    id ? apiKeysQuery?.find((key) => key.id === id)?.name : undefined;

  const sourceLabel = (email: { apiId?: number | null; campaignId?: string | null }) => {
    if (email.campaignId) return "Campaign";
    const name = apiKeyName(email.apiId);
    if (name) return `API · ${name}`;
    return email.apiId ? "API" : "—";
  };

  const handleExport = async () => {
    try {
      const resp = await exportQuery.refetch();
      if (!resp.data) return;

      const escape = (val: unknown) => {
        const s = String(val ?? "");
        const startsRisky = /^\s*[=+\-@]/.test(s);
        const safe = (startsRisky ? "'" : "") + s.replace(/"/g, '""');
        return /[",\r\n]/.test(safe) ? `"${safe}"` : safe;
      };

      const header = [
        "To",
        "Status",
        "Subject",
        "Sent At",
        "Bounce Type",
        "Bounce Subtype",
        "Bounce Reason",
      ].join(",");
      const rows = resp.data.map((e) =>
        [
          e.to,
          e.status,
          e.subject,
          e.sentAt,
          e.bounceType,
          e.bounceSubType,
          e.bounceReason,
        ]
          .map(escape)
          .join(","),
      );
      const csv = [header, ...rows].join("\n");

      const blob = new Blob(["﻿" + csv], {
        type: "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `emails-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed", err);
    }
  };

  const moreActive = currentStatus && MORE_STATUSES.includes(currentStatus);

  return (
    <div className="mt-6 flex flex-col gap-4">
      <div className="flex items-end gap-1 overflow-x-auto border-b no-scrollbar">
        {STATUS_TABS.map((tab) => {
          const active = currentStatus === tab.value;
          const count =
            tab.value === null ? totalCount : counts ? (counts[tab.value] ?? 0) : null;
          return (
            <button
              key={tab.label}
              type="button"
              onClick={() => applyFilter(setStatus, tab.value)}
              className={`-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-[13px] transition-colors ${
                active
                  ? "border-foreground font-medium text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
              {count !== null ? (
                <span className="text-xs tabular-nums text-muted-foreground">
                  {count.toLocaleString()}
                </span>
              ) : null}
            </button>
          );
        })}
        <Select
          value={moreActive ? (currentStatus as string) : "more"}
          onValueChange={(val) => applyFilter(setStatus, val === "more" ? null : val)}
        >
          <SelectTrigger
            className={`-mb-px h-auto w-auto shrink-0 gap-1.5 rounded-none border-0 border-b-2 bg-transparent px-3 py-2 text-[13px] shadow-none focus:ring-0 ${
              moreActive
                ? "border-foreground font-medium text-foreground"
                : "border-transparent text-muted-foreground"
            }`}
          >
            {moreActive ? statusLabel(currentStatus as string) : "More"}
            {moreActive && counts ? (
              <span className="text-xs tabular-nums text-muted-foreground">
                {(counts[currentStatus as EmailStatus] ?? 0).toLocaleString()}
              </span>
            ) : null}
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="more">All statuses</SelectItem>
            {MORE_STATUSES.map((value) => (
              <SelectItem key={value} value={value}>
                {statusLabel(value)}
                {counts ? ` (${(counts[value] ?? 0).toLocaleString()})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
        <Input
          placeholder="Search recipient, subject or email ID"
          className="h-8 w-full text-[13px] lg:w-auto lg:min-w-[260px] lg:flex-1"
          defaultValue={search ?? ""}
          onChange={(e) => debouncedSearch(e.target.value)}
        />
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <Select
            value={range ?? DEFAULT_RANGE}
            onValueChange={(val) => applyFilter(setRange, val)}
          >
            <SelectTrigger className="h-8 w-full text-[13px] sm:w-[150px]">
              {DATE_RANGES.find((r) => r.value === (range ?? DEFAULT_RANGE))
                ?.label ?? "Last 30 days"}
            </SelectTrigger>
            <SelectContent>
              {DATE_RANGES.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={domain ?? "all"}
            onValueChange={(val) => applyFilter(setDomain, val === "all" ? null : val)}
          >
            <SelectTrigger className="h-8 w-full text-[13px] sm:w-[180px]">
              <span className="truncate">
                {domain
                  ? (domainsQuery?.find((d) => d.id === Number(domain))?.name ??
                    "Domain")
                  : "All domains"}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All domains</SelectItem>
              {domainsQuery?.map((d) => (
                <SelectItem key={d.id} value={d.id.toString()}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={apiKey ?? "all"}
            onValueChange={(val) => applyFilter(setApiKey, val === "all" ? null : val)}
          >
            <SelectTrigger className="h-8 w-full text-[13px] sm:w-[160px]">
              <span className="truncate">
                {apiKey ? (apiKeyName(Number(apiKey)) ?? "API key") : "All API keys"}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All API keys</SelectItem>
              {apiKeysQuery?.map((key) => (
                <SelectItem key={key.id} value={key.id.toString()}>
                  {key.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={exportQuery.isFetching}
            className="h-8 w-full text-[13px] sm:w-auto"
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            {exportQuery.isFetching ? "Exporting..." : "Export CSV"}
          </Button>
        </div>
      </div>

      <div className="flex flex-col rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted dark:bg-muted/70">
              <TableHead className="w-[150px] rounded-tl-md">Status</TableHead>
              <TableHead>Recipient</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead className="hidden md:table-cell">Source</TableHead>
              <TableHead className="whitespace-nowrap text-right rounded-tr-md">
                Sent ({DISPLAY_TIME_ZONE_LABEL})
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {emailsQuery.isLoading ? (
              <TableRow className="h-32">
                <TableCell colSpan={5} className="py-4 text-center">
                  <Spinner
                    className="mx-auto h-6 w-6"
                    innerSvgClass="stroke-primary"
                  />
                </TableCell>
              </TableRow>
            ) : emails.length ? (
              emails.map((email) => {
                const to = recipients(email.to);
                const at = email.scheduledAt ?? email.createdAt;
                return (
                  <TableRow
                    key={email.id}
                    onClick={() => setSelectedEmail(email.id)}
                    data-state={selectedEmail === email.id ? "selected" : undefined}
                    className="cursor-pointer"
                  >
                    <TableCell>
                      <EmailStatusBadge status={email.latestStatus ?? "SENT"} />
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="max-w-[240px] truncate" title={to.join(", ")}>
                        {to[0]}
                        {to.length > 1 ? (
                          <span className="ml-1 text-xs font-normal text-muted-foreground">
                            +{to.length - 1}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div
                        className="max-w-[160px] truncate text-muted-foreground md:max-w-[240px] xl:max-w-[360px]"
                        title={email.subject ?? undefined}
                      >
                        {email.subject}
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      <div className="max-w-[180px] truncate">{sourceLabel(email)}</div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right font-mono text-xs text-muted-foreground">
                      <span
                        title={`${formatDashboardTimeLong(at)} · ${formatDistanceToNow(
                          new Date(at),
                          { addSuffix: true },
                        )}`}
                      >
                        {formatDashboardTime(at)}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow className="h-32">
                <TableCell colSpan={5} className="py-4 text-center text-muted-foreground">
                  No emails match these filters.
                  {days !== undefined ? " Try a longer date range." : ""}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <DynamicSheetWithNoSSR
          open={!!selectedEmail}
          onOpenChange={handleSheetChange}
        >
          <DynamicSheetContentWithNoSSR className="sm:max-w-2xl overflow-y-auto no-scrollbar">
            <SheetTitle className="sr-only">Email Details</SheetTitle>
            <SheetDescription className="sr-only">
              Detailed view of the selected email.
            </SheetDescription>
            {selectedEmail ? <EmailDetails emailId={selectedEmail} /> : null}
          </DynamicSheetContentWithNoSSR>
        </DynamicSheetWithNoSSR>
      </div>

      <div className="flex flex-col gap-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span>
          Page {pageNumber}
          {emails.length ? ` · ${emails.length} on this page` : ""}
          <span className="hidden lg:inline">
            {" "}
            · Press J / K to move between emails while one is open
          </span>
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => setPage((pageNumber - 1).toString())}
            disabled={pageNumber === 1}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => setPage((pageNumber + 1).toString())}
            disabled={emails.length !== DEFAULT_QUERY_LIMIT}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
