"use client";

import CampaignList from "./campaign-list";
import CreateCampaign from "./create-campaign";
import { H1 } from "@usesend/ui";

export default function ContactsPage() {
  return (
    <div>
      <div className="flex justify-between items-start gap-4">
        <div>
          <H1>Broadcasting</H1>
          <p className="mt-1 text-sm text-muted-foreground">
            Campaigns sent to your audience lists.
          </p>
        </div>
        <CreateCampaign />
      </div>
      <CampaignList />
    </div>
  );
}
