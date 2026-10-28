"use client";

import { useState } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import { format } from "date-fns";
import { useDebouncedCallback } from "use-debounce";
import { Badge } from "@usesend/ui/src/badge";
import { Button } from "@usesend/ui/src/button";
import { Input } from "@usesend/ui/src/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@usesend/ui/src/select";
import Spinner from "@usesend/ui/src/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@usesend/ui/src/table";
import { toast } from "@usesend/ui/src/toaster";
import {
  ADMIN_USER_CSV_HEADER,
  adminUserToCsvRow,
  toCsv,
} from "~/lib/admin-users";
import { api } from "~/trpc/react";
import { isCloud } from "~/utils/common";

const PAGE_SIZE = 25;

const FILTERS = [
  { value: "all", label: "All users" },
  { value: "paid", label: "Paid plan" },
  { value: "free", label: "Free plan" },
  { value: "blocked", label: "Blocked team" },
  { value: "waitlisted", label: "Waitlisted" },
] as const;

type FilterValue = (typeof FILTERS)[number]["value"];

export default function AdminUsersPage() {
  const cloud = isCloud();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterValue>("all");

  const usersQuery = api.admin.listUsers.useQuery(
    { page, pageSize: PAGE_SIZE, search: search || undefined, filter },
    { enabled: cloud, placeholderData: keepPreviousData },
  );

  const exportUsers = api.admin.exportUsers.useMutation({
    onSuccess: (result) => {
      const csv = toCsv([
        [...ADMIN_USER_CSV_HEADER],
        ...result.items.map(adminUserToCsvRow),
      ]);
      const url = URL.createObjectURL(
        new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `f14-users-${format(new Date(), "yyyy-MM-dd")}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success(
        result.truncated
          ? `Exported the first ${result.items.length.toLocaleString()} users`
          : `Exported ${result.items.length.toLocaleString()} users`,
      );
    },
    onError: (error) => toast.error(error.message),
  });

  const debouncedSearch = useDebouncedCallback((value: string) => {
    setSearch(value.trim());
    setPage(1);
  }, 400);

  if (!cloud) {
    return (
      <div className="rounded-lg border bg-muted/30 p-6 text-sm text-muted-foreground">
        The user list is available only in the cloud deployment.
      </div>
    );
  }

  const data = usersQuery.data;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search by email, name or team"
          className="w-full sm:max-w-[320px]"
          onChange={(event) => debouncedSearch(event.target.value)}
        />
        <Select
          value={filter}
          onValueChange={(value) => {
            setFilter(value as FilterValue);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[170px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FILTERS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {data ? `${data.total.toLocaleString()} users` : ""}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={exportUsers.isPending}
            onClick={() =>
              exportUsers.mutate({ search: search || undefined, filter })
            }
          >
            {exportUsers.isPending ? "Exporting..." : "Export CSV"}
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted dark:bg-muted/70">
              <TableHead className="rounded-tl-md px-3">User</TableHead>
              <TableHead className="px-3">Team</TableHead>
              <TableHead className="px-3">Plan</TableHead>
              <TableHead className="px-3 text-right">Domains</TableHead>
              <TableHead className="px-3 text-right">Sent (month)</TableHead>
              <TableHead className="rounded-tr-md px-3">Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {usersQuery.isLoading ? (
              <TableRow className="h-32">
                <TableCell colSpan={6} className="text-center">
                  <Spinner className="mx-auto h-6 w-6" />
                </TableCell>
              </TableRow>
            ) : data && data.items.length > 0 ? (
              data.items.map((user) => (
                <TableRow key={user.id} className="align-top">
                  <TableCell className="px-3 py-3">
                    <div className="max-w-[260px] truncate font-medium" title={user.email ?? ""}>
                      {user.email ?? "(no email)"}
                    </div>
                    <div className="max-w-[260px] truncate text-xs text-muted-foreground">
                      {user.name ?? "-"} · ID {user.id}
                    </div>
                    {user.isWaitlisted ? (
                      <Badge variant="outline" className="mt-1">
                        Waitlisted
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell className="px-3 py-3">
                    {user.teams.length === 0 ? (
                      <span className="text-muted-foreground">No team</span>
                    ) : (
                      user.teams.map((team) => (
                        <div key={team.id} className="max-w-[220px] truncate" title={team.name}>
                          {team.name}{" "}
                          <span className="text-xs text-muted-foreground">
                            #{team.id} · {team.role.toLowerCase()}
                          </span>
                          {team.isBlocked ? (
                            <Badge variant="destructive" className="ml-1">
                              Blocked
                            </Badge>
                          ) : null}
                        </div>
                      ))
                    )}
                  </TableCell>
                  <TableCell className="px-3 py-3">
                    {user.teams.map((team) => (
                      <div key={team.id}>
                        <Badge variant={team.paid ? "default" : "secondary"}>
                          {team.planLabel}
                        </Badge>
                      </div>
                    ))}
                  </TableCell>
                  <TableCell className="px-3 py-3 text-right font-mono">
                    {user.teams.map((team) => (
                      <div key={team.id}>{team.domains}</div>
                    ))}
                  </TableCell>
                  <TableCell className="px-3 py-3 text-right font-mono">
                    {user.teams.map((team) => (
                      <div key={team.id}>{team.sentThisMonth.toLocaleString()}</div>
                    ))}
                  </TableCell>
                  <TableCell className="whitespace-nowrap px-3 py-3 text-muted-foreground">
                    {format(new Date(user.createdAt), "dd MMM yyyy")}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow className="h-32">
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No users match this search.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end gap-3">
        <span className="text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => setPage((current) => Math.max(1, current - 1))}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => setPage((current) => current + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
