"use client";

import { H1 } from "@usesend/ui";
import { AddWebhook } from "./add-webhook";
import { WebhookList } from "./webhook-list";

export default function WebhooksPage() {
  return (
    <div>
      <div className="flex justify-between items-start gap-4">
        <div>
          <H1>Webhooks</H1>
          <p className="mt-1 text-sm text-muted-foreground">
            Endpoints that receive email and domain events from F14.
          </p>
        </div>
        <AddWebhook />
      </div>
      <WebhookList />
    </div>
  );
}
