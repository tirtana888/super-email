"use client";

import { H1 } from "@usesend/ui";
import { SettingsNavButton } from "./settings-nav-button";

export const dynamic = "force-static";

export default function ApiKeysPage({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <H1>Developer settings</H1>
      <p className="mt-1 text-sm text-muted-foreground">
        API keys and SMTP credentials for sending from your code.
      </p>
      <div className="mt-5 flex gap-1 border-b">
        <SettingsNavButton href="/dev-settings">API keys</SettingsNavButton>
        <SettingsNavButton href="/dev-settings/smtp">SMTP</SettingsNavButton>
      </div>
      <div className="mt-8">{children}</div>
    </div>
  );
}
