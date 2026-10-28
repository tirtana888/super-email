"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Button } from "@usesend/ui/src/button";
import { SheetDescription, SheetTitle } from "@usesend/ui/src/sheet";
import {
  SNIPPET_LANGUAGES,
  templateSendSnippet,
  type SnippetLanguage,
} from "~/lib/template-variables";

const Sheet = dynamic(() => import("@usesend/ui/src/sheet").then((m) => m.Sheet), {
  ssr: false,
});
const SheetContent = dynamic(
  () => import("@usesend/ui/src/sheet").then((m) => m.SheetContent),
  { ssr: false },
);

const LANGUAGE_KEY = "f14.templates.snippetLanguage";

export type ApiSheetTemplate = { id: string; name: string; variables: string[] };

/**
 * Code to send an email with a template, opened on demand so the template
 * list keeps all its space for the templates themselves.
 */
export default function TemplateApiSheet({
  open,
  onOpenChange,
  template,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: ApiSheetTemplate | null;
}) {
  const [language, setLanguage] = useState<SnippetLanguage>("curl");
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
    try {
      const saved = window.localStorage.getItem(LANGUAGE_KEY);
      if (saved && SNIPPET_LANGUAGES.some((l) => l.id === saved)) {
        setLanguage(saved as SnippetLanguage);
      }
    } catch {
      // Storage can be unavailable; the default language is fine.
    }
  }, []);

  const chooseLanguage = (id: SnippetLanguage) => {
    setLanguage(id);
    try {
      window.localStorage.setItem(LANGUAGE_KEY, id);
    } catch {
      // Ignore: the choice just won't be remembered.
    }
  };

  const copy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => setCopied((current) => (current === key ? null : current)), 1500);
    } catch {
      setCopied(null);
    }
  };

  const templateId = template?.id ?? "YOUR_TEMPLATE_ID";
  const variables = template?.variables ?? [];
  const code = templateSendSnippet(language, { baseUrl: origin, templateId, variables });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-5 overflow-y-auto sm:max-w-xl">
        <div className="flex flex-col gap-1 pr-8">
          <SheetTitle className="text-base font-semibold">Send with the API</SheetTitle>
          <SheetDescription className="text-[13px]">
            {template ? (
              <>
                Template <span className="font-medium text-foreground">{template.name}</span>
              </>
            ) : (
              "Pick a template from the list to fill in its ID and variables."
            )}
          </SheetDescription>
        </div>

        {template ? (
          <div className="flex flex-wrap items-center gap-2 text-[13px]">
            <span className="text-muted-foreground">Template ID</span>
            <code className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs">
              {template.id}
            </code>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => copy("id", template.id)}
            >
              {copied === "id" ? "Copied" : "Copy ID"}
            </Button>
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          <div className="flex items-end justify-between gap-2 border-b">
            <div className="flex gap-1" role="tablist" aria-label="Language">
              {SNIPPET_LANGUAGES.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  role="tab"
                  aria-selected={language === l.id}
                  onClick={() => chooseLanguage(l.id)}
                  className={`-mb-px border-b-2 px-3 py-2 text-[13px] transition-colors ${
                    language === l.id
                      ? "border-foreground font-medium text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mb-1 h-7 text-xs"
              onClick={() => copy("code", code)}
            >
              {copied === "code" ? "Copied" : "Copy code"}
            </Button>
          </div>
          <pre className="whitespace-pre-wrap break-all rounded-md border bg-muted px-3 py-3 font-mono text-[12px] leading-relaxed text-foreground">
            {code}
          </pre>
        </div>

        <div className="flex flex-col gap-1.5 text-xs leading-relaxed text-muted-foreground">
          <p>
            Replace <code className="font-mono text-foreground">YOUR_API_KEY</code> with a key from{" "}
            <Link href="/dev-settings" className="text-foreground underline underline-offset-2">
              Developer settings
            </Link>
            , and <code className="font-mono text-foreground">from</code> with an address on a
            verified domain.
          </p>
          <p>
            {variables.length
              ? "Send a value for every variable. A variable you leave out can stay in the email as its {{placeholder}}."
              : "This template has no variables, so the template ID is all it needs."}
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
