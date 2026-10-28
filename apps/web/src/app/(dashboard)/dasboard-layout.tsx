"use client";

import { AppSidebar } from "~/components/AppSideBar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@usesend/ui/src/sidebar";
import { useIsMobile } from "@usesend/ui/src/hooks/use-mobile";
import { UpgradeModal } from "~/components/payments/UpgradeModal";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollLeft = 0;
    }

    window.scrollTo({ left: 0 });
    document.documentElement.scrollLeft = 0;
    document.body.scrollLeft = 0;
  }, [pathname]);

  return (
    <div className="h-full bg-sidebar-background">
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="min-w-0">
          <main
            ref={mainRef}
            className="h-full flex-1 overflow-y-auto overflow-x-hidden px-4 pb-12 pt-5 md:px-10 md:pt-8"
          >
            <div className="mx-auto w-full max-w-[1200px]">
              {isMobile ? (
                <SidebarTrigger className="h-5 w-5 text-muted-foreground" />
              ) : null}
              {children}
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
      <UpgradeModal />
    </div>
  );
}
