"use client";

import { useTeam } from "~/providers/team-context";
import { SettingsNavButton } from "../dev-settings/settings-nav-button";
import { isCloud } from "~/utils/common";

export const dynamic = "force-static";

export default function ApiKeysPage({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentIsAdmin } = useTeam();

  return (
    <div>
      <h1 className="text-lg font-semibold tracking-tight">Settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Plan, usage, billing and team members.
      </p>
      <div className="mt-5 flex gap-1 border-b">
        {isCloud() ? (
          <SettingsNavButton href="/settings">Usage</SettingsNavButton>
        ) : null}
        {currentIsAdmin && isCloud() ? (
          <SettingsNavButton href="/settings/billing">
            Billing
          </SettingsNavButton>
        ) : null}
        <SettingsNavButton href="/settings/team">Team</SettingsNavButton>
      </div>
      <div className="mt-8">{children}</div>
    </div>
  );
}
