"use client";

import TemplateList from "./template-list";
import CreateTemplate from "./create-template";
import { H1 } from "@usesend/ui";

export default function TemplatesPage() {
  return (
    <div>
      <div className="flex justify-between items-start gap-4">
        <div>
          <H1>Templates</H1>
          <p className="mt-1 text-sm text-muted-foreground">
            Reusable email designs. Send one from the API with its template ID.
          </p>
        </div>
        <CreateTemplate />
      </div>
      <TemplateList />
    </div>
  );
}
