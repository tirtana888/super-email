"use client";

import DomainsList from "./domain-list";
import AddDomain from "./add-domain";
import { H1 } from "@usesend/ui";

export default function DomainsPage() {
  return (
    <div>
      <div className="flex justify-between items-start gap-4">
        <div>
          <H1>Domains</H1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sending domains and their DNS records. A domain must be verified before it can send.
          </p>
        </div>
        <AddDomain />
      </div>
      <DomainsList />
    </div>
  );
}
