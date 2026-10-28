"use client";

import { Button } from "@usesend/ui/src/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@usesend/ui/src/dialog";
import { api } from "~/trpc/react";
import React, { useState } from "react";
import { toast } from "@usesend/ui/src/toaster";
import { Copy } from "lucide-react";
import { Campaign } from "@prisma/client";

export const DuplicateCampaign: React.FC<{
  campaign: Partial<Campaign> & { id: string };
}> = ({ campaign }) => {
  const [open, setOpen] = useState(false);
  const duplicateCampaignMutation =
    api.campaign.duplicateCampaign.useMutation();

  const utils = api.useUtils();

  async function onCampaignDuplicate() {
    duplicateCampaignMutation.mutate(
      {
        campaignId: campaign.id,
      },
      {
        onSuccess: () => {
          utils.campaign.getCampaigns.invalidate();
          setOpen(false);
          toast.success(`Campaign duplicated`);
        },
      },
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(_open) => (_open !== open ? setOpen(_open) : null)}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground" title="Duplicate">
          <Copy className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Duplicate Campaign</DialogTitle>
          <DialogDescription>
            Are you sure you want to duplicate{" "}
            <span className="font-semibold text-foreground">
              {campaign.name}
            </span>
            ?
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <div className="flex justify-end">
            <Button
              onClick={onCampaignDuplicate}
              variant="default"
              disabled={duplicateCampaignMutation.isPending}
            >
              {duplicateCampaignMutation.isPending
                ? "Duplicating..."
                : "Duplicate"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DuplicateCampaign;
