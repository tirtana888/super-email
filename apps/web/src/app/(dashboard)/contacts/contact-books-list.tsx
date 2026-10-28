"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { useDebouncedCallback } from "use-debounce";
import { Input } from "@usesend/ui/src/input";
import Spinner from "@usesend/ui/src/spinner";
import { StatusDot } from "@usesend/ui/src/status-dot";
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
import DeleteContactBook from "./delete-contact-book";
import EditContactBook from "./edit-contact-book";

export default function ContactBooksList() {
  const [search, setSearch] = useUrlState("search");
  const contactBooksQuery = api.contacts.getContactBooks.useQuery({
    search: search ?? undefined,
  });
  const router = useRouter();

  const debouncedSearch = useDebouncedCallback((value: string) => {
    setSearch(value.trim() || null);
  }, 400);

  const books = contactBooksQuery.data ?? [];
  const totals = books.reduce(
    (acc, b) => {
      acc.contacts += b._count.contacts;
      acc.subscribed += b.subscribedCount;
      return acc;
    },
    { contacts: 0, subscribed: 0 },
  );

  return (
    <div className="mt-6 flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          placeholder="Search contact lists"
          className="h-8 w-full text-[13px] sm:max-w-sm"
          defaultValue={search ?? ""}
          onChange={(e) => debouncedSearch(e.target.value)}
        />
        {contactBooksQuery.data ? (
          <span className="text-xs text-muted-foreground sm:ml-auto">
            {books.length.toLocaleString()} list{books.length === 1 ? "" : "s"} ·{" "}
            {totals.contacts.toLocaleString()} contacts · {totals.subscribed.toLocaleString()}{" "}
            subscribed
          </span>
        ) : null}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted dark:bg-muted/70">
              <TableHead className="rounded-tl-md">List</TableHead>
              <TableHead className="text-right">Contacts</TableHead>
              <TableHead className="text-right">Subscribed</TableHead>
              <TableHead className="hidden text-right md:table-cell">Unsubscribed</TableHead>
              <TableHead className="hidden lg:table-cell">Double opt-in</TableHead>
              <TableHead className="hidden whitespace-nowrap text-right sm:table-cell">
                Created ({DISPLAY_TIME_ZONE_LABEL})
              </TableHead>
              <TableHead className="w-20 rounded-tr-md">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contactBooksQuery.isLoading ? (
              <TableRow className="h-32">
                <TableCell colSpan={7} className="text-center">
                  <Spinner className="mx-auto h-6 w-6" innerSvgClass="stroke-primary" />
                </TableCell>
              </TableRow>
            ) : books.length ? (
              books.map((book) => {
                const total = book._count.contacts;
                const unsubscribed = Math.max(0, total - book.subscribedCount);
                const subscribedShare = total > 0 ? book.subscribedCount / total : 0;
                return (
                  <TableRow
                    key={book.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/contacts/${book.id}`)}
                  >
                    <TableCell>
                      <Link
                        href={`/contacts/${book.id}`}
                        className="flex min-w-0 items-center gap-2 font-medium text-foreground hover:underline hover:underline-offset-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span aria-hidden className="shrink-0 text-sm">
                          {book.emoji}
                        </span>
                        <span className="truncate" title={book.name}>
                          {book.name}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="text-right">{total.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <span>{book.subscribedCount.toLocaleString()}</span>
                      {total > 0 ? (
                        <span className="ml-1.5 text-xs text-muted-foreground">
                          {(subscribedShare * 100).toFixed(0)}%
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="hidden text-right text-muted-foreground md:table-cell">
                      {unsubscribed.toLocaleString()}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {book.doubleOptInEnabled ? (
                        <StatusDot tone="ok">On</StatusDot>
                      ) : (
                        <StatusDot tone="neutral">Off</StatusDot>
                      )}
                    </TableCell>
                    <TableCell className="hidden whitespace-nowrap text-right font-mono text-xs text-muted-foreground sm:table-cell">
                      <span
                        title={`${formatDashboardTimeLong(book.createdAt)} · ${formatDistanceToNow(
                          new Date(book.createdAt),
                          { addSuffix: true },
                        )}`}
                      >
                        {formatDashboardTime(book.createdAt, { seconds: false })}
                      </span>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-0.5">
                        <EditContactBook contactBook={book} />
                        <DeleteContactBook contactBook={book} />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow className="h-32">
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  {search
                    ? "No contact lists match this search."
                    : "No contact lists yet. Create one, then add contacts or upload a CSV."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
