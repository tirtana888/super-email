"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CampaignStatus } from "@prisma/client";
import { formatDistanceToNow } from "date-fns";
import { useDebouncedCallback } from "use-debounce";
import { Button } from "@usesend/ui/src/button";
import { Input } from "@usesend/ui/src/input";
import Spinner from "@usesend/ui/src/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@usesend/ui/src/table";
import { api } from "~/trpc/react";
import { useUrlState } from "~/hooks/useUrlState";
import {
  DISPLAY_TIME_ZONE_LABEL,
  formatDashboardTime,
  formatDashboardTimeLong,
} from "~/lib/format-time";
import CampaignStatusBadge from "./campaign-status-badge";
import DeleteCampaign from "./delete-campaign";
import DuplicateCampaign from "./duplicate-campaign";
import TogglePauseCampaign from "./toggle-pause-campaign";

const STATUS_TABS: Array<{ label: string; value: CampaignStatus | null }> = [
  { label: "All", value: null },
  { label: "Draft", value: CampaignStatus.DRAFT },
  { label: "Scheduled", value: CampaignStatus.SCHEDULED },
  { label: "Running", value: CampaignStatus.RUNNING },
  { label: "Paused", value: CampaignStatus.PAUSED },
  { label: "Sent", value: CampaignStatus.SENT },
];

const rate = (part: number, whole: number) =>
  whole > 0 ? `${((part / whole) * 100).toFixed(1)}%` : "—";

function isEditable(status: CampaignStatus) {
  return status === CampaignStatus.DRAFT || status === CampaignStatus.SCHEDULED;
}

export default function CampaignList() {
  const router = useRouter();
  const [page, setPage] = useUrlState("page", "1");
  const [status, setStatus] = useUrlState("status");
  const [search, setSearch] = useUrlState("search");

  const pageNumber = Number(page);
  const currentStatus = (status as CampaignStatus | null) || null;

  const campaignsQuery = api.campaign.getCampaigns.useQuery(
    { page: pageNumber, status: currentStatus, search },
    {
      // Keep sending progress fresh while anything is going out.
      refetchInterval: (query) => {
        const list = query.state.data?.campaigns;
        if (!list) return false;
        return list.some(
          (c) => c.status === CampaignStatus.RUNNING || c.status === CampaignStatus.SCHEDULED,
        )
          ? 5000
          : false;
      },
    },
  );
  const countsQuery = api.campaign.campaignStatusCounts.useQuery({ search });
  const { data: contactBooks } = api.contacts.getContactBooks.useQuery({});

  const bookName = new Map((contactBooks ?? []).map((b) => [b.id, `${b.emoji} ${b.name}`]));
  const counts = countsQuery.data;
  const total = counts ? Object.values(counts).reduce((s, n) => s + (n ?? 0), 0) : null;
  const campaigns = campaignsQuery.data?.campaigns ?? [];

  const debouncedSearch = useDebouncedCallback((value: string) => {
    setSearch(value.trim() || null);
    setPage("1");
  }, 400);

  const applyStatus = (value: CampaignStatus | null) => {
    setStatus(value);
    setPage("1");
  };

  const href = (c: { id: string; status: CampaignStatus }) =>
    isEditable(c.status) ? `/campaigns/${c.id}/edit` : `/campaigns/${c.id}`;

  const timeCell = (c: (typeof campaigns)[number]) => {
    const [label, at] =
      c.status === CampaignStatus.SCHEDULED && c.scheduledAt
        ? ["Scheduled", c.scheduledAt]
        : c.status === CampaignStatus.DRAFT
          ? ["Edited", c.updatedAt]
          : ["Last sent", c.lastSentAt ?? c.updatedAt];
    return (
      <span
        title={`${label} ${formatDashboardTimeLong(at)} · ${formatDistanceToNow(new Date(at), {
          addSuffix: true,
        })}`}
      >
        <span className="mr-1.5 font-sans text-muted-foreground/80">{label}</span>
        {formatDashboardTime(at, { seconds: false })}
      </span>
    );
  };

  return (
    <div className="mt-6 flex flex-col gap-4">
      <div className="flex items-end gap-1 overflow-x-auto border-b no-scrollbar">
        {STATUS_TABS.map((tab) => {
          const active = currentStatus === tab.value;
          const count = counts ? (tab.value ? (counts[tab.value] ?? 0) : total) : null;
          return (
            <button
              key={tab.label}
              type="button"
              onClick={() => applyStatus(tab.value)}
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
      </div>

      <Input
        placeholder="Search name or subject"
        className="h-8 w-full text-[13px] sm:max-w-sm"
        defaultValue={search ?? ""}
        onChange={(e) => debouncedSearch(e.target.value)}
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted dark:bg-muted/70">
              <TableHead className="rounded-tl-md">Campaign</TableHead>
              <TableHead className="w-[150px]">Status</TableHead>
              <TableHead className="hidden xl:table-cell">Audience</TableHead>
              <TableHead className="text-right">Recipients</TableHead>
              <TableHead className="hidden text-right md:table-cell">Delivered</TableHead>
              <TableHead className="hidden text-right lg:table-cell">Opened</TableHead>
              <TableHead className="hidden text-right lg:table-cell">Clicked</TableHead>
              <TableHead className="hidden text-right xl:table-cell">Unsubscribed</TableHead>
              <TableHead className="hidden whitespace-nowrap text-right sm:table-cell">
                When ({DISPLAY_TIME_ZONE_LABEL})
              </TableHead>
              <TableHead className="w-24 rounded-tr-md">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaignsQuery.isLoading ? (
              <TableRow className="h-32">
                <TableCell colSpan={10} className="text-center">
                  <Spinner className="mx-auto h-6 w-6" innerSvgClass="stroke-primary" />
                </TableCell>
              </TableRow>
            ) : campaigns.length ? (
              campaigns.map((c) => {
                const sending =
                  c.status === CampaignStatus.RUNNING || c.status === CampaignStatus.PAUSED;
                const progress = c.total > 0 ? Math.min(1, c.sent / c.total) : 0;
                return (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer"
                    onClick={() => router.push(href(c))}
                  >
                    <TableCell>
                      <Link
                        href={href(c)}
                        className="font-medium text-foreground hover:underline hover:underline-offset-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {c.name}
                      </Link>
                      <div
                        className="mt-0.5 max-w-[320px] truncate text-xs text-muted-foreground"
                        title={c.subject}
                      >
                        {c.subject || "No subject"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <CampaignStatusBadge status={c.status} />
                      {sending && c.total > 0 ? (
                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="h-1 w-20 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-foreground/70"
                              style={{ width: `${progress * 100}%` }}
                            />
                          </div>
                          <span className="text-[11px] tabular-nums text-muted-foreground">
                            {Math.round(progress * 100)}%
                          </span>
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground xl:table-cell">
                      <div className="max-w-[180px] truncate">
                        {c.contactBookId ? (bookName.get(c.contactBookId) ?? "—") : "—"}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {c.total > 0 ? c.total.toLocaleString() : "—"}
                      {sending ? (
                        <div className="text-[11px] text-muted-foreground">
                          {c.sent.toLocaleString()} sent
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="hidden text-right md:table-cell">
                      {rate(c.delivered, c.sent)}
                    </TableCell>
                    <TableCell className="hidden text-right lg:table-cell">
                      {rate(c.opened, c.delivered)}
                    </TableCell>
                    <TableCell className="hidden text-right lg:table-cell">
                      {rate(c.clicked, c.delivered)}
                    </TableCell>
                    <TableCell className="hidden text-right text-muted-foreground xl:table-cell">
                      {c.unsubscribed > 0 ? c.unsubscribed.toLocaleString() : "—"}
                    </TableCell>
                    <TableCell className="hidden whitespace-nowrap text-right font-mono text-xs text-muted-foreground sm:table-cell">
                      {timeCell(c)}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-0.5">
                        {c.status === CampaignStatus.SCHEDULED ||
                        c.status === CampaignStatus.RUNNING ||
                        c.status === CampaignStatus.PAUSED ? (
                          <TogglePauseCampaign campaign={c} />
                        ) : null}
                        <DuplicateCampaign campaign={c} />
                        <DeleteCampaign campaign={c} />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow className="h-32">
                <TableCell colSpan={10} className="text-center text-muted-foreground">
                  {search || currentStatus
                    ? "No campaigns match these filters."
                    : "No campaigns yet. Create one to send to a contact list."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Page {pageNumber} of {Math.max(1, campaignsQuery.data?.totalPage ?? 1)}
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
            disabled={pageNumber >= (campaignsQuery.data?.totalPage ?? 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
