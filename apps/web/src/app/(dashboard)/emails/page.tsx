"use client";

import EmailList from "./email-list";
import { H1 } from "@usesend/ui";

export default function EmailsPage() {
  return (
    <div>
      <div className="flex justify-between items-start">
        <div>
          <H1>Emails</H1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every email sent through the API, SMTP and campaigns.
          </p>
        </div>
      </div>
      <EmailList />
    </div>
  );
}
