"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@usesend/ui/src/breadcrumb";
import Link from "next/link";
import { H2 } from "@usesend/ui";

import Spinner from "@usesend/ui/src/spinner";
import { api } from "~/trpc/react";
import { use } from "react";
import { CampaignStatus } from "@prisma/client";
import { formatDistanceToNow } from "date-fns";
import TogglePauseCampaign from "../toggle-pause-campaign";
import CampaignStatusBadge from "../../campaigns/campaign-status-badge";
import { Button } from "@usesend/ui/src/button";
import { Card, CardContent, CardHeader, CardTitle } from "@usesend/ui/src/card";
import { EmailStatusBadge } from "../../emails/email-status-badge";
import { AnimatePresence, motion } from "framer-motion";

export default function CampaignDetailsPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = use(params);

  const { data: campaign, isLoading } = api.campaign.getCampaign.useQuery(
    { campaignId: campaignId },
    {
      refetchInterval: (query) => {
        const c: any = query.state.data;
        if (!c) return false;

        if (
          c.status === CampaignStatus.RUNNING ||
          c.status === CampaignStatus.PAUSED
        ) {
          return 5000;
        }
        return false;
      },
    }
  );

  const { data: latestEmails, isLoading: latestEmailsLoading } =
    api.campaign.latestEmails.useQuery(
      { campaignId: campaignId },
      {
        refetchInterval: 5000,
      }
    );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner className="w-5 h-5 text-foreground" />
      </div>
    );
  }

  if (!campaign) {
    return <div>Campaign not found</div>;
  }

  const sentCount = campaign.sent ?? 0;
  const deliveredCount = campaign.delivered ?? 0;
  const rateOf = (part: number, whole: number) =>
    whole > 0 ? `${((part / whole) * 100).toFixed(1)}%` : "—";

  // Delivery and bounces are counted against what was sent; engagement and
  // unsubscribes against what was delivered.
  const kpis = [
    {
      label: "Recipients",
      value: (campaign.total ?? 0).toLocaleString(),
      detail:
        (campaign.total ?? 0) > 0
          ? `${sentCount.toLocaleString()} sent · ${rateOf(sentCount, campaign.total ?? 0)}`
          : "Not sent yet",
    },
    { label: "Delivered", value: rateOf(deliveredCount, sentCount), detail: `${deliveredCount.toLocaleString()} delivered` },
    { label: "Open rate", value: rateOf(campaign.opened ?? 0, deliveredCount), detail: `${(campaign.opened ?? 0).toLocaleString()} opened` },
    { label: "Click rate", value: rateOf(campaign.clicked ?? 0, deliveredCount), detail: `${(campaign.clicked ?? 0).toLocaleString()} clicked` },
    { label: "Bounce rate", value: rateOf(campaign.bounced ?? 0, sentCount), detail: `${(campaign.bounced ?? 0).toLocaleString()} bounced` },
    { label: "Unsubscribed", value: rateOf(campaign.unsubscribed ?? 0, deliveredCount), detail: `${(campaign.unsubscribed ?? 0).toLocaleString()} unsubscribed · ${(campaign.complained ?? 0).toLocaleString()} spam` },
  ];

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/campaigns" className="text-lg">
                  Broadcasting
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="text-lg" />
            <BreadcrumbItem>
              <BreadcrumbPage className="text-lg ">
                <div className="flex items-center gap-2">
                  <div className="max-w-[300px] truncate">{campaign.name}</div>
                  <CampaignStatusBadge status={campaign.status} />
                </div>
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        {campaign.status === "SCHEDULED" ? (
          <Link href={`/campaigns/${campaign.id}/edit`}>
            <Button>Edit</Button>
          </Link>
        ) : (
          <TogglePauseCampaign campaign={campaign} mode="full" />
        )}
      </div>

      <section
        aria-label="Campaign results"
        className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-md border bg-border md:grid-cols-3 2xl:grid-cols-6"
      >
        {kpis.map((kpi) => (
          <div key={kpi.label} className="flex min-w-0 flex-col bg-card px-4 py-3">
            <span className="text-xs font-medium text-muted-foreground">{kpi.label}</span>
            <span className="mt-1.5 text-2xl font-semibold leading-none tabular-nums tracking-tight">
              {kpi.value}
            </span>
            <span className="mt-1.5 truncate text-xs tabular-nums text-muted-foreground">
              {kpi.detail}
            </span>
          </div>
        ))}
      </section>

      <div className="mt-6">
        <div className="grid gap-6">
          <Card>
            <CardHeader className="flex gap-2">
              <CardTitle className="text-sm font-semibold">Live activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex h-[300px] flex-col">
                {latestEmailsLoading ? (
                  <div className="flex flex-1 items-center justify-center">
                    <Spinner className="h-5 w-5 text-foreground" />
                  </div>
                ) : !latestEmails || latestEmails.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center">
                    <div className="rounded   text-sm text-muted-foreground">
                      No recent user actions yet.
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 overflow-y-auto overscroll-y-contain pr-1 no-scrollbar">
                    <AnimatePresence initial={true}>
                      {latestEmails.map((email) => {
                        const recipients = email.to ?? [];
                        const primaryRecipient =
                          recipients.length > 0
                            ? recipients[0]
                            : "Unknown recipient";
                        const timestamp =
                          email.latestStatus === "SCHEDULED" &&
                          email.scheduledAt
                            ? new Date(email.scheduledAt)
                            : new Date(email.updatedAt ?? email.createdAt);
                        const relativeTime = formatDistanceToNow(timestamp, {
                          addSuffix: true,
                        });

                        return (
                          <motion.div
                            key={email.id}
                            layout
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -12 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="flex flex-col gap-2 border-b pb-4 last:border-b-0 last:pb-0"
                          >
                            <div className="text-sm font-mono">
                              {primaryRecipient}
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <EmailStatusBadge status={email.latestStatus} />
                              <span className="whitespace-nowrap text-xs text-muted-foreground font-mono">
                                {relativeTime}
                              </span>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {campaign.html && (
        <div className="mt-8">
          <H2 className="mb-4">Email</H2>

          <div className="flex w-full flex-col gap-4 rounded-md border bg-card p-2">
            <div className="flex flex-col gap-3 px-4 py-1">
              <div className=" flex text-sm">
                <div className="w-[70px] text-muted-foreground">Subject</div>
                <div> {campaign.subject}</div>
              </div>
              <div className="flex  text-sm">
                <div className="w-[70px] text-muted-foreground">From</div>
                <div> {campaign.from}</div>
              </div>
              <div className="flex  text-sm items-center">
                <div className="w-[70px] text-muted-foreground">Contact</div>
                <Link
                  href={`/contacts/${campaign.contactBookId}`}
                  target="_blank"
                >
                  <div className="bg-secondary p-0.5 px-2 rounded-md ">
                    {campaign.contactBook?.emoji} &nbsp;
                    {campaign.contactBook?.name}
                  </div>
                </Link>
              </div>
            </div>
            <div className=" dark:bg-slate-50 overflow-auto text-black rounded border-t">
              <iframe
                className="w-full min-h-[600px]"
                srcDoc={campaign.html ?? ""}
                sandbox="allow-same-origin"
                title="Campaign email preview"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

