"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";
import { useUrlState } from "~/hooks/useUrlState";
import { useDebouncedCallback } from "use-debounce";
import { SuppressionReason } from "@prisma/client";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@usesend/ui/src/button";
import { Input } from "@usesend/ui/src/input";
import { StatusDot, type StatusTone } from "@usesend/ui/src/status-dot";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@usesend/ui/src/table";
import { Download, Trash2 } from "lucide-react";
import RemoveSuppressionDialog, { type RemovalTarget } from "./remove-suppression";
import Spinner from "@usesend/ui/src/spinner";
import {
  DISPLAY_TIME_ZONE_LABEL,
  formatDashboardTime,
  formatDashboardTimeLong,
} from "~/lib/format-time";

const PAGE_SIZE = 50;

const reasonLabels: Record<SuppressionReason, string> = {
  HARD_BOUNCE: "Hard bounce",
  COMPLAINT: "Complaint",
  MANUAL: "Manual",
};

const reasonTone: Record<SuppressionReason, StatusTone> = {
  HARD_BOUNCE: "bad",
  COMPLAINT: "warn",
  MANUAL: "neutral",
};

const REASON_TABS: Array<{ label: string; value: SuppressionReason | null }> = [
  { label: "All", value: null },
  { label: "Hard bounce", value: "HARD_BOUNCE" },
  { label: "Complaint", value: "COMPLAINT" },
  { label: "Manual", value: "MANUAL" },
];

export default function SuppressionList() {
  const [search, setSearch] = useUrlState("search");
  const [reason, setReason] = useUrlState("reason");
  const [page, setPage] = useUrlState("page", "1");
  const [selected, setSelected] = useState<Map<string, SuppressionReason>>(new Map());
  const [toRemove, setToRemove] = useState<RemovalTarget[]>([]);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const headerCheckbox = useRef<HTMLInputElement>(null);

  const pageNumber = parseInt(page || "1");
  const currentReason = (reason as SuppressionReason | null) || null;

  const suppressionsQuery = api.suppression.getSuppressions.useQuery({
    page: pageNumber,
    limit: PAGE_SIZE,
    search: search || undefined,
    reason: currentReason,
    sortBy: "createdAt",
    sortOrder: "desc",
  });
  const statsQuery = api.suppression.getSuppressionStats.useQuery();

  const exportQuery = api.suppression.exportSuppressions.useQuery(
    { search: search || undefined, reason: currentReason },
    { enabled: false },
  );

  const utils = api.useUtils();

  const removeMutation = api.suppression.removeSuppressions.useMutation({
    onSuccess: (result) => {
      utils.suppression.getSuppressions.invalidate();
      utils.suppression.getSuppressionStats.invalidate();
      setSelected(new Map());
      if (result.failed.length > 0) {
        setRemoveError(
          `${result.failed.length} address${result.failed.length === 1 ? "" : "es"} could not be removed. Try again.`,
        );
        return;
      }
      setToRemove([]);
    },
    onError: (error) => setRemoveError(error.message),
  });

  const rows = suppressionsQuery.data?.suppressions ?? [];

  // The selection belongs to the rows on screen; a new page or filter clears it.
  useEffect(() => {
    setSelected(new Map());
  }, [pageNumber, currentReason, search]);

  const allOnPageSelected = rows.length > 0 && rows.every((r) => selected.has(r.email));
  const someOnPageSelected = rows.some((r) => selected.has(r.email));

  useEffect(() => {
    if (headerCheckbox.current) {
      headerCheckbox.current.indeterminate = someOnPageSelected && !allOnPageSelected;
    }
  }, [someOnPageSelected, allOnPageSelected]);

  const toggle = (email: string, rowReason: SuppressionReason) => {
    setSelected((current) => {
      const next = new Map(current);
      if (next.has(email)) next.delete(email);
      else next.set(email, rowReason);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(
      allOnPageSelected ? new Map() : new Map(rows.map((r) => [r.email, r.reason])),
    );
  };

  const applyReason = (value: SuppressionReason | null) => {
    setReason(value);
    setPage("1");
  };

  const debouncedSearch = useDebouncedCallback((value: string) => {
    setSearch(value.trim() || null);
    setPage("1");
  }, 600);

  const openRemoval = (targets: RemovalTarget[]) => {
    setRemoveError(null);
    setToRemove(targets);
  };

  const handleExport = async () => {
    const resp = await exportQuery.refetch();
    if (!resp.data) return;

    const csv = [
      "Email,Reason,Source email ID,Created At",
      ...resp.data.map((s) =>
        [s.email, s.reason, s.source ?? "", s.createdAt].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `exclusions-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const stats = statsQuery.data;
  const total = stats ? stats.HARD_BOUNCE + stats.COMPLAINT + stats.MANUAL : null;
  const pagination = suppressionsQuery.data?.pagination;
  const selectedTargets: RemovalTarget[] = [...selected].map(([email, r]) => ({
    email,
    reason: r,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end gap-1 overflow-x-auto border-b no-scrollbar">
        {REASON_TABS.map((tab) => {
          const active = currentReason === tab.value;
          const count = stats ? (tab.value ? stats[tab.value] : total) : null;
          return (
            <button
              key={tab.label}
              type="button"
              onClick={() => applyReason(tab.value)}
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

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          placeholder="Search email address"
          className="h-8 w-full text-[13px] sm:max-w-sm"
          defaultValue={search || ""}
          onChange={(e) => debouncedSearch(e.target.value)}
        />
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-[13px] sm:ml-auto"
          onClick={handleExport}
          disabled={exportQuery.isFetching}
        >
          <Download className="mr-1.5 h-3.5 w-3.5" />
          {exportQuery.isFetching ? "Exporting..." : "Export CSV"}
        </Button>
      </div>

      {selected.size > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-md border bg-muted/50 py-1.5 pl-3 pr-1.5 text-[13px]">
          <span className="font-medium">{selected.size} selected</span>
          <span className="text-muted-foreground">
            Removed addresses can receive email again.
          </span>
          <div className="ml-auto flex gap-1">
            <Button variant="ghost" size="sm" className="h-7" onClick={() => setSelected(new Map())}>
              Clear
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="h-7"
              onClick={() => openRemoval(selectedTargets)}
            >
              Remove from list
            </Button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted dark:bg-muted/70">
              <TableHead className="w-10 rounded-tl-md">
                <input
                  ref={headerCheckbox}
                  type="checkbox"
                  aria-label="Select all addresses on this page"
                  className="h-3.5 w-3.5 cursor-pointer accent-[hsl(var(--foreground))]"
                  checked={allOnPageSelected}
                  onChange={toggleAll}
                  disabled={rows.length === 0}
                />
              </TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="w-[140px]">Reason</TableHead>
              <TableHead className="hidden md:table-cell">Triggered by</TableHead>
              <TableHead className="whitespace-nowrap text-right">
                Added ({DISPLAY_TIME_ZONE_LABEL})
              </TableHead>
              <TableHead className="w-12 rounded-tr-md">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppressionsQuery.isLoading ? (
              <TableRow className="h-32">
                <TableCell colSpan={6} className="py-4 text-center">
                  <Spinner className="mx-auto h-6 w-6" innerSvgClass="stroke-primary" />
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow className="h-32">
                <TableCell colSpan={6} className="py-4 text-center text-muted-foreground">
                  {search || currentReason
                    ? "No addresses match these filters."
                    : "No excluded addresses yet. Hard bounces and spam complaints are added here automatically."}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((suppression) => (
                <TableRow
                  key={suppression.id}
                  data-state={selected.has(suppression.email) ? "selected" : undefined}
                >
                  <TableCell>
                    <input
                      type="checkbox"
                      aria-label={`Select ${suppression.email}`}
                      className="h-3.5 w-3.5 cursor-pointer accent-[hsl(var(--foreground))]"
                      checked={selected.has(suppression.email)}
                      onChange={() => toggle(suppression.email, suppression.reason)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="max-w-[280px] truncate" title={suppression.email}>
                      {suppression.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusDot tone={reasonTone[suppression.reason]}>
                      {reasonLabels[suppression.reason]}
                    </StatusDot>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {suppression.sourceEmail ? (
                      <Link
                        href={`/emails?emailId=${encodeURIComponent(suppression.sourceEmail.id)}`}
                        className="flex max-w-[320px] items-baseline gap-2 truncate hover:text-foreground"
                        title={suppression.sourceEmail.subject}
                      >
                        <span className="shrink-0 font-mono text-xs underline decoration-border underline-offset-2">
                          {suppression.sourceEmail.id.slice(0, 10)}…
                        </span>
                        <span className="truncate">{suppression.sourceEmail.subject}</span>
                      </Link>
                    ) : suppression.reason === "MANUAL" ? (
                      "Added manually"
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right font-mono text-xs text-muted-foreground">
                    <span
                      title={`${formatDashboardTimeLong(suppression.createdAt)} · ${formatDistanceToNow(
                        new Date(suppression.createdAt),
                        { addSuffix: true },
                      )}`}
                    >
                      {formatDashboardTime(suppression.createdAt, { seconds: false })}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                      aria-label={`Remove ${suppression.email}`}
                      onClick={() =>
                        openRemoval([{ email: suppression.email, reason: suppression.reason }])
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {pagination && pagination.totalCount > 0
            ? `${((pagination.page - 1) * pagination.limit + 1).toLocaleString()}–${Math.min(
                pagination.page * pagination.limit,
                pagination.totalCount,
              ).toLocaleString()} of ${pagination.totalCount.toLocaleString()}`
            : ""}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => setPage(String(pageNumber - 1))}
            disabled={pageNumber === 1}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => setPage(String(pageNumber + 1))}
            disabled={!pagination?.hasNext}
          >
            Next
          </Button>
        </div>
      </div>

      <RemoveSuppressionDialog
        targets={toRemove}
        open={toRemove.length > 0}
        onOpenChange={(open) => {
          if (!open) {
            setToRemove([]);
            setRemoveError(null);
          }
        }}
        onConfirm={(confirmComplaints) =>
          removeMutation.mutate({
            emails: toRemove.map((t) => t.email),
            confirmComplaints,
          })
        }
        isLoading={removeMutation.isPending}
        error={removeError}
      />
    </div>
  );
}
