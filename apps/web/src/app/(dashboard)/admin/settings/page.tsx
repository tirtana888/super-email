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

  const setDomainConnectEnabled = api.admin.setDomainConnectEnabled.useMutation({
    onSuccess: async (result) => {
      await utils.admin.getFeatureFlags.invalidate();
      toast.success(
        result.domainConnectEnabled
          ? "One-click DNS setup is now enabled"
          : "One-click DNS setup is now disabled",
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
  const domainConnectEnabled = flags.data?.domainConnectEnabled ?? false;
  const domainConnectConfigured = flags.data?.domainConnectConfigured ?? false;

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

      <div className="rounded-lg border p-6 shadow-sm">
        <div className="flex items-center justify-between gap-6">
          <div>
            <p className="font-medium">One-click DNS setup (Domain Connect)</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Shows a &quot;Set up automatically&quot; button on the domain page
              for domains whose DNS provider has approved the F14 template (for
              example Cloudflare). The customer approves the records at their
              provider and returns to F14. Off by default, and the button only
              appears when the provider has published the template.
            </p>
            {!domainConnectConfigured ? (
              <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
                The signing key is not configured on the server, so this switch
                has no effect yet.
              </p>
            ) : null}
          </div>
          <Switch
            checked={domainConnectEnabled}
            disabled={setDomainConnectEnabled.isPending || flags.isError}
            onCheckedChange={(enabled) =>
              setDomainConnectEnabled.mutate({ enabled })
            }
            aria-label="Toggle one-click DNS setup"
          />
        </div>
      </div>
    </div>
  );
}
