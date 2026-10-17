"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@usesend/ui/src/dialog";
import { useUpgradeModalStore } from "~/store/upgradeModalStore";
import { LimitReason } from "~/lib/constants/plans";
import { UpgradeButton } from "./UpgradeButton";

export const UpgradeModal = () => {
  const {
    isOpen,
    reason,
    action: { closeModal },
  } = useUpgradeModalStore();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upgrade your plan</DialogTitle>
          <DialogDescription>
            {(() => {
              const messages: Record<LimitReason, string> = {
                [LimitReason.DOMAIN]:
                  "You've reached the domain limit for your current plan.",
                [LimitReason.CONTACT_BOOK]:
                  "You've reached the contact book limit for your current plan.",
                [LimitReason.TEAM_MEMBER]:
                  "You've reached the team member limit for your current plan.",
                [LimitReason.WEBHOOK]:
                  "You've reached the webhook limit for your current plan.",
                [LimitReason.EMAIL_BLOCKED]:
                  "You've reached the email sending limit for your current plan.",
                [LimitReason.EMAIL_DAILY_LIMIT_REACHED]:
                  "You've reached the email sending limit for your current plan.",
                [LimitReason.EMAIL_FREE_PLAN_MONTHLY_LIMIT_REACHED]:
                  "You've reached the email sending limit for your current plan.",
              };
              return reason
                ? `${messages[reason] ?? ""} Upgrade to unlock this feature and more.`
                : "Pick a plan with higher limits.";
            })()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <UpgradeButton />
        </div>
      </DialogContent>
    </Dialog>
  );
};
