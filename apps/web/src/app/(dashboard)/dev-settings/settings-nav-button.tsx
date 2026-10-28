"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

export const SettingsNavButton: React.FC<{
  href: string;
  children: React.ReactNode;
  comingSoon?: boolean;
}> = ({ href, children, comingSoon }) => {
  const pathname = usePathname();

  const isActive = pathname === href;

  if (comingSoon) {
    return (
      <div className="flex items-center justify-between hover:text-foreground cursor-not-allowed mt-1">
        <div
          className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-foreground cursor-not-allowed ${isActive ? " bg-secondary" : "text-muted-foreground"}`}
        >
          {children}
        </div>
        <div className="text-muted-foreground px-4 py-0.5 text-xs bg-muted rounded-full">
          soon
        </div>
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={`-mb-px flex items-center gap-2 border-b-2 px-3 py-2 text-[13px] transition-colors ${isActive ? "border-foreground font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
    >
      {children}
    </Link>
  );
};
