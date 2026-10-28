"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { useDebouncedCallback } from "use-debounce";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@usesend/ui/src/table";
import { Button } from "@usesend/ui/src/button";
import { Input } from "@usesend/ui/src/input";
import Spinner from "@usesend/ui/src/spinner";
import { api } from "~/trpc/react";
import { useUrlState } from "~/hooks/useUrlState";
import {
  DISPLAY_TIME_ZONE_LABEL,
  formatDashboardTime,
  formatDashboardTimeLong,
} from "~/lib/format-time";
import { templateSendExample } from "~/lib/template-variables";
import DeleteTemplate from "./delete-template";
import DuplicateTemplate from "./duplicate-template";

const VISIBLE_VARIABLES = 3;

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={copy}>
      {copied ? "Copied" : label}
    </Button>
  );
}

function IdChip({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      title={copied ? "Copied" : `${id} · click to copy`}
      className="inline-flex items-center gap-1.5 rounded border bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground hover:text-foreground"
    >
      {id.slice(0, 10)}…
      <span className="text-[10px] uppercase tracking-wide">{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}

export default function TemplateList() {
  const [page, setPage] = useUrlState("page", "1");
  const [search, setSearch] = useUrlState("search");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");

  const pageNumber = Number(page);

  const templateQuery = api.template.getTemplates.useQuery({
    page: pageNumber,
    search: search || undefined,
  });

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const templates = templateQuery.data?.templates ?? [];
  const selected = templates.find((t) => t.id === selectedId) ?? templates[0];

  const debouncedSearch = useDebouncedCallback((value: string) => {
    setSearch(value.trim() || null);
    setPage("1");
  }, 500);

  return (
    <div className="mt-6 flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          placeholder="Search name, subject or template ID"
          className="h-8 w-full text-[13px] sm:max-w-sm"
          defaultValue={search ?? ""}
          onChange={(e) => debouncedSearch(e.target.value)}
        />
        {templateQuery.data ? (
          <span className="text-xs text-muted-foreground sm:ml-auto">
            {templateQuery.data.total.toLocaleString()} template
            {templateQuery.data.total === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>

      <div className="grid items-start gap-4 2xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted dark:bg-muted/70">
                <TableHead className="rounded-tl-md">Name</TableHead>
                <TableHead className="hidden lg:table-cell">Variables</TableHead>
                <TableHead className="hidden md:table-cell">Template ID</TableHead>
                <TableHead className="whitespace-nowrap text-right">
                  Edited ({DISPLAY_TIME_ZONE_LABEL})
                </TableHead>
                <TableHead className="w-20 rounded-tr-md">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templateQuery.isLoading ? (
                <TableRow className="h-32">
                  <TableCell colSpan={5} className="py-4 text-center">
                    <Spinner className="mx-auto h-6 w-6" innerSvgClass="stroke-primary" />
                  </TableCell>
                </TableRow>
              ) : templates.length ? (
                templates.map((template) => (
                  <TableRow
                    key={template.id}
                    data-state={selected?.id === template.id ? "selected" : undefined}
                    className="cursor-pointer"
                    onClick={() => setSelectedId(template.id)}
                  >
                    <TableCell>
                      <Link
                        href={`/templates/${template.id}/edit`}
                        className="font-medium text-foreground hover:underline hover:underline-offset-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {template.name}
                      </Link>
                      <div
                        className="mt-0.5 max-w-[360px] truncate text-xs text-muted-foreground"
                        title={template.subject}
                      >
                        {template.subject || "No subject"}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {template.variables.length ? (
                        <div className="flex flex-wrap gap-1">
                          {template.variables.slice(0, VISIBLE_VARIABLES).map((name) => (
                            <code
                              key={name}
                              className="rounded border bg-muted px-1.5 py-px font-mono text-[11px] text-muted-foreground"
                            >
                              {name}
                            </code>
                          ))}
                          {template.variables.length > VISIBLE_VARIABLES ? (
                            <span className="px-1 text-[11px] text-muted-foreground">
                              +{template.variables.length - VISIBLE_VARIABLES}
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">None</span>
                      )}
                    </TableCell>
                    <TableCell
                      className="hidden md:table-cell"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <IdChip id={template.id} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right font-mono text-xs text-muted-foreground">
                      <span
                        title={`${formatDashboardTimeLong(template.updatedAt)} · ${formatDistanceToNow(
                          new Date(template.updatedAt),
                          { addSuffix: true },
                        )}`}
                      >
                        {formatDashboardTime(template.updatedAt, { seconds: false })}
                      </span>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-0.5">
                        <DuplicateTemplate template={template} />
                        <DeleteTemplate template={template} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow className="h-32">
                  <TableCell colSpan={5} className="py-4 text-center text-muted-foreground">
                    {search
                      ? "No templates match this search."
                      : "No templates yet. Create one to send the same design from the API."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {selected ? (
          <aside className="flex min-w-0 flex-col gap-3 rounded-md border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{selected.name}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  Edited {formatDashboardTimeLong(selected.updatedAt)}
                </div>
              </div>
              <Button asChild variant="outline" size="sm" className="h-7 shrink-0 text-xs">
                <Link href={`/templates/${selected.id}/edit`}>Edit</Link>
              </Button>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="text-xs font-medium text-muted-foreground">Send with this template</div>
              <pre className="whitespace-pre-wrap break-all rounded-md border bg-muted px-3 py-2.5 font-mono text-[11.5px] leading-relaxed text-foreground">
                <span className="text-muted-foreground">POST</span> {origin}/api/v1/emails
                {"\n"}
                {templateSendExample({
                  templateId: selected.id,
                  variables: selected.variables,
                })}
              </pre>
              <div className="flex gap-2">
                <CopyButton
                  label="Copy request body"
                  value={templateSendExample({
                    templateId: selected.id,
                    variables: selected.variables,
                  })}
                />
                <CopyButton label="Copy template ID" value={selected.id} />
              </div>
            </div>

            <p className="text-xs leading-relaxed text-muted-foreground">
              {selected.variables.length
                ? "Send a value for every variable listed. A variable you leave out can stay in the email as its {{placeholder}}."
                : "This template has no variables. Send it with the template ID alone."}
            </p>
          </aside>
        ) : null}
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Page {pageNumber} of {Math.max(1, templateQuery.data?.totalPage ?? 1)}
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
            disabled={pageNumber >= (templateQuery.data?.totalPage ?? 0)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
