"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { useDebouncedCallback } from "use-debounce";
import { Code2, LayoutGrid, List } from "lucide-react";
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
import { getEmailPreviewSrcDoc } from "~/lib/email-preview";
import DeleteTemplate from "./delete-template";
import DuplicateTemplate from "./duplicate-template";
import TemplateApiSheet, { type ApiSheetTemplate } from "./template-api-sheet";

const VISIBLE_VARIABLES = 3;

type View = "list" | "grid";

function IdChip({ id, compact = false }: { id: string; compact?: boolean }) {
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
      {copied && compact ? "Copied" : `${id.slice(0, 10)}…`}
      {compact ? null : (
        <span className="text-[10px] uppercase tracking-wide">{copied ? "Copied" : "Copy"}</span>
      )}
    </button>
  );
}

function ApiButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
      aria-label={label}
      title="Send with the API"
      onClick={onClick}
    >
      <Code2 className="h-3.5 w-3.5" />
    </Button>
  );
}

function Variables({ names }: { names: string[] }) {
  if (!names.length) {
    return <span className="text-xs text-muted-foreground">None</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {names.slice(0, VISIBLE_VARIABLES).map((name) => (
        <code
          key={name}
          className="rounded border bg-muted px-1.5 py-px font-mono text-[11px] text-muted-foreground"
        >
          {name}
        </code>
      ))}
      {names.length > VISIBLE_VARIABLES ? (
        <span className="px-1 text-[11px] text-muted-foreground">
          +{names.length - VISIBLE_VARIABLES}
        </span>
      ) : null}
    </div>
  );
}

// A scaled, non-interactive render of the saved HTML for the grid view.
function Preview({ html }: { html: string | null | undefined }) {
  const srcDoc = getEmailPreviewSrcDoc(html, null);
  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-t-md border-b bg-white">
      {srcDoc ? (
        <iframe
          title="Template preview"
          srcDoc={srcDoc}
          sandbox=""
          loading="lazy"
          tabIndex={-1}
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 h-[900px] w-[640px] origin-top-left scale-[0.45] border-0"
        />
      ) : (
        <div className="flex h-full items-center justify-center text-xs text-zinc-500">
          No content yet
        </div>
      )}
    </div>
  );
}

export default function TemplateList() {
  const [page, setPage] = useUrlState("page", "1");
  const [search, setSearch] = useUrlState("search");
  const [view, setView] = useUrlState("view", "list");
  const [apiOpen, setApiOpen] = useState(false);
  const [apiTemplate, setApiTemplate] = useState<ApiSheetTemplate | null>(null);

  const pageNumber = Number(page);
  const currentView: View = view === "grid" ? "grid" : "list";

  const templateQuery = api.template.getTemplates.useQuery({
    page: pageNumber,
    search: search || undefined,
    withHtml: currentView === "grid",
  });

  const templates = templateQuery.data?.templates ?? [];

  const debouncedSearch = useDebouncedCallback((value: string) => {
    setSearch(value.trim() || null);
    setPage("1");
  }, 400);

  const openApi = (template: ApiSheetTemplate | null) => {
    setApiTemplate(template);
    setApiOpen(true);
  };

  const edited = (date: Date) => (
    <span
      title={`${formatDashboardTimeLong(date)} · ${formatDistanceToNow(new Date(date), {
        addSuffix: true,
      })}`}
    >
      {formatDashboardTime(date, { seconds: false })}
    </span>
  );

  const empty = search
    ? "No templates match this search."
    : "No templates yet. Create one to send the same design from the API.";

  return (
    <div className="mt-6 flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          placeholder="Search name, subject or template ID"
          className="h-8 w-full text-[13px] sm:max-w-sm"
          defaultValue={search ?? ""}
          onChange={(e) => debouncedSearch(e.target.value)}
        />
        <div className="flex items-center gap-2 sm:ml-auto">
          {templateQuery.data ? (
            <span className="mr-1 text-xs text-muted-foreground">
              {templateQuery.data.total.toLocaleString()} template
              {templateQuery.data.total === 1 ? "" : "s"}
            </span>
          ) : null}
          <div className="flex rounded-md border p-0.5" role="group" aria-label="View">
            {(
              [
                ["list", List, "List view"],
                ["grid", LayoutGrid, "Grid view"],
              ] as const
            ).map(([value, Icon, label]) => (
              <button
                key={value}
                type="button"
                aria-label={label}
                aria-pressed={currentView === value}
                title={label}
                onClick={() => setView(value)}
                className={`flex h-6 w-7 items-center justify-center rounded-[4px] transition-colors ${
                  currentView === value
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-[13px]"
            onClick={() => openApi(null)}
          >
            <Code2 className="h-3.5 w-3.5" />
            API
          </Button>
        </div>
      </div>

      {templateQuery.isLoading ? (
        <div className="flex h-40 items-center justify-center rounded-md border">
          <Spinner className="h-6 w-6" innerSvgClass="stroke-primary" />
        </div>
      ) : currentView === "grid" ? (
        templates.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {templates.map((template) => (
              <div key={template.id} className="flex min-w-0 flex-col rounded-md border bg-card">
                <Link href={`/templates/${template.id}/edit`} aria-label={`Edit ${template.name}`}>
                  <Preview html={template.html} />
                </Link>
                <div className="flex flex-col gap-1 px-3 py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/templates/${template.id}/edit`}
                      className="truncate text-[13px] font-medium hover:underline hover:underline-offset-4"
                    >
                      {template.name}
                    </Link>
                    <div className="-mr-1 -mt-0.5 flex shrink-0 gap-0.5">
                      <ApiButton
                        label={`Send ${template.name} with the API`}
                        onClick={() => openApi(template)}
                      />
                      <DuplicateTemplate template={template} />
                      <DeleteTemplate template={template} />
                    </div>
                  </div>
                  <div className="truncate text-xs text-muted-foreground" title={template.subject}>
                    {template.subject || "No subject"}
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <IdChip id={template.id} compact />
                    <span className="shrink-0 whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                      {edited(template.updatedAt)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-32 items-center justify-center rounded-md border text-[13px] text-muted-foreground">
            {empty}
          </div>
        )
      ) : (
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
                <TableHead className="w-28 rounded-tr-md">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.length ? (
                templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell>
                      <Link
                        href={`/templates/${template.id}/edit`}
                        className="font-medium text-foreground hover:underline hover:underline-offset-4"
                      >
                        {template.name}
                      </Link>
                      <div
                        className="mt-0.5 max-w-[420px] truncate text-xs text-muted-foreground"
                        title={template.subject}
                      >
                        {template.subject || "No subject"}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Variables names={template.variables} />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <IdChip id={template.id} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right font-mono text-xs text-muted-foreground">
                      {edited(template.updatedAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-0.5">
                        <ApiButton
                          label={`Send ${template.name} with the API`}
                          onClick={() => openApi(template)}
                        />
                        <DuplicateTemplate template={template} />
                        <DeleteTemplate template={template} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow className="h-32">
                  <TableCell colSpan={5} className="py-4 text-center text-muted-foreground">
                    {empty}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

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

      <TemplateApiSheet open={apiOpen} onOpenChange={setApiOpen} template={apiTemplate} />
    </div>
  );
}
