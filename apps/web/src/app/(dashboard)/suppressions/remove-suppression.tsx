"use client";

import { useEffect, useState } from "react";
import { SuppressionReason } from "@prisma/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@usesend/ui/src/dialog";
import { Button } from "@usesend/ui/src/button";
import { Input } from "@usesend/ui/src/input";

export type RemovalTarget = { email: string; reason: SuppressionReason };

interface RemoveSuppressionDialogProps {
  targets: RemovalTarget[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (confirmComplaints: boolean) => void;
  isLoading: boolean;
  error?: string | null;
}

/**
 * Confirms removing addresses from the exclusion list. Addresses that reported
 * spam need the address (one) or the word REMOVE (several) typed first, because
 * mailing people who complained is what gets an SES account suspended.
 */
export default function RemoveSuppressionDialog({
  targets,
  open,
  onOpenChange,
  onConfirm,
  isLoading,
  error,
}: RemoveSuppressionDialogProps) {
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (!open) setTyped("");
  }, [open]);

  const complaints = targets.filter((t) => t.reason === "COMPLAINT");
  const single = targets.length === 1 ? targets[0] : undefined;
  const phrase = single ? single.email : "REMOVE";
  const needsTyping = complaints.length > 0;
  const confirmed = !needsTyping || typed.trim().toLowerCase() === phrase.toLowerCase();

  const title = single
    ? "Remove address from Exclusions"
    : `Remove ${targets.length} addresses from Exclusions`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {single ? (
              <>
                <span className="font-medium text-foreground">{single.email}</span>{" "}
                will be able to receive email from this team again.
              </>
            ) : (
              <>These addresses will be able to receive email from this team again.</>
            )}
          </DialogDescription>
        </DialogHeader>

        {needsTyping ? (
          <div className="flex flex-col gap-3 rounded-md border border-l-[3px] border-l-yellow bg-muted/40 px-3 py-2.5 text-[13px]">
            <p>
              {single
                ? "This person marked one of your emails as spam."
                : `${complaints.length} of these addresses marked your email as spam.`}{" "}
              Sending to them again raises your complaint rate and can get sending
              suspended for every domain on this account.
            </p>
            <label className="flex flex-col gap-1.5" htmlFor="confirm-removal">
              <span className="text-muted-foreground">
                Type <span className="font-mono text-foreground">{phrase}</span> to confirm
              </span>
              <Input
                id="confirm-removal"
                autoComplete="off"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                className="h-8 text-[13px]"
              />
            </label>
          </div>
        ) : null}

        {error ? <p className="text-[13px] text-red">{error}</p> : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => onConfirm(needsTyping && confirmed)}
            disabled={isLoading || !confirmed}
          >
            {isLoading
              ? "Removing..."
              : single
                ? "Remove address"
                : `Remove ${targets.length} addresses`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
