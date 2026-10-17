"use client";

import { Switch } from "@usesend/ui/src/switch";
import Spinner from "@usesend/ui/src/spinner";
import { toast } from "@usesend/ui/src/toaster";
import { api } from "~/trpc/react";
import { isCloud } from "~/utils/common";

export default function AdminSettingsPage() {
  const utils = api.useUtils();
  const flags = api.admin.getFeatureFlags.useQuery(undefined, {
    enabled: isCloud(),
  });

  const setFeedbackEnabled = api.admin.setFeedbackEnabled.useMutation({
    onSuccess: async (result) => {
      await Promise.all([
        utils.admin.getFeatureFlags.invalidate(),
        utils.appSettings.getPublicFlags.invalidate(),
      ]);
      toast.success(
        result.feedbackEnabled
          ? "Feedback is now visible to users"
          : "Feedback is now hidden from users",
      );
    },
    onError: (error) => {
      toast.error(error.message ?? "Unable to update the setting");
    },
  });

  if (!isCloud()) {
    return (
      <div className="rounded-lg border bg-muted/30 p-6 text-sm text-muted-foreground">
        These settings are available only in the cloud deployment.
      </div>
    );
  }

  if (flags.isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner className="h-5 w-5" />
      </div>
    );
  }

  const feedbackEnabled = flags.data?.feedbackEnabled ?? false;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="rounded-lg border p-6 shadow-sm">
        <div className="flex items-center justify-between gap-6">
          <div>
            <p className="font-medium">User feedback</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Shows a Feedback button in the sidebar for every signed-in user.
              Messages are emailed to the founder address. Off by default;
              changes can take up to a minute to appear for users who already
              have the dashboard open.
            </p>
          </div>
          <Switch
            checked={feedbackEnabled}
            disabled={setFeedbackEnabled.isPending || flags.isError}
            onCheckedChange={(enabled) =>
              setFeedbackEnabled.mutate({ enabled })
            }
            aria-label="Toggle user feedback"
          />
        </div>
      </div>
    </div>
  );
}
