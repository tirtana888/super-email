"use client";

import { Button } from "@usesend/ui/src/button";
import { api } from "~/trpc/react";
import React from "react";
import { Pause, Play } from "lucide-react";
import { Campaign, CampaignStatus } from "@prisma/client";
import { toast } from "@usesend/ui/src/toaster";

export const TogglePauseCampaign: React.FC<{
  campaign: Partial<Campaign> & { id: string; status?: CampaignStatus };
  mode?: "icon" | "full";
}> = ({ campaign, mode = "icon" }) => {
  const utils = api.useUtils();
  const pauseMutation = api.campaign.pauseCampaign.useMutation();
  const resumeMutation = api.campaign.resumeCampaign.useMutation();

  const isPaused = campaign.status === CampaignStatus.PAUSED;

  const onToggle = () => {
    if (isPaused) {
      resumeMutation.mutate(
        { campaignId: campaign.id },
        {
          onSuccess: () => {
            utils.campaign.getCampaigns.invalidate();
            utils.campaign.getCampaign.invalidate();
            toast.success("Campaign resumed");
          },
        }
      );
    } else {
      pauseMutation.mutate(
        { campaignId: campaign.id },
        {
          onSuccess: () => {
            utils.campaign.getCampaigns.invalidate();
            utils.campaign.getCampaign.invalidate();
            toast.success("Campaign paused");
          },
        }
      );
    }
  };

  const pending = pauseMutation.isPending || resumeMutation.isPending;

  if (
    campaign.status !== CampaignStatus.PAUSED &&
    campaign.status !== CampaignStatus.RUNNING
  ) {
    return null;
  }

  return (
    <>
      {mode === "icon" ? (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
          onClick={onToggle}
          disabled={pending}
          title={isPaused ? "Resume" : "Pause"}
        >
          {isPaused ? (
            <Play className="h-3.5 w-3.5" />
          ) : (
            <Pause className="h-3.5 w-3.5" />
          )}
        </Button>
      ) : (
        <Button
          variant="default"
          className="gap-2 border-primary"
          onClick={onToggle}
          disabled={pending}
          title={isPaused ? "Resume" : "Pause"}
        >
          {isPaused ? (
            <>
              <Play className="h-[18px] w-[18px]" />
              <span>Resume</span>
            </>
          ) : (
            <>
              <Pause className="h-[18px] w-[18px] " />
              <span>Pause</span>
            </>
          )}
        </Button>
      )}
    </>
  );
};

export default TogglePauseCampaign;
