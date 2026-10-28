"use client";

import { api } from "~/trpc/react";
import { DomainStatus } from "@prisma/client";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@usesend/ui/src/breadcrumb";
import {
  DomainStatusBadge,
  domainStatusLabel,
  domainStatusTone,
} from "../domain-badge";
import { StatusDot } from "@usesend/ui/src/status-dot";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@usesend/ui/src/table";
import { TextWithCopyButton } from "@usesend/ui/src/text-with-copy";
import React, { use } from "react";
import { Switch } from "@usesend/ui/src/switch";
import DeleteDomain from "./delete-domain";
import SendTestMail from "./send-test-mail";
import { Button } from "@usesend/ui/src/button";
import Link from "next/link";
import { toast } from "@usesend/ui/src/toaster";
import {
  CLOUDFLARE_DNS_URL,
  formatDnsRecordsForCopy,
} from "~/lib/dns-provider";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "~/server/api/root";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type DomainResponse = NonNullable<RouterOutputs["domain"]["getDomain"]>;

export default function DomainItemPage({
  params,
}: {
  params: Promise<{ domainId: string }>;
}) {
  const { domainId } = use(params);

  const domainQuery = api.domain.getDomain.useQuery(
    {
      id: Number(domainId),
    },
    {
      refetchInterval: (q) => (q?.state.data?.isVerifying ? 10000 : false),
      refetchIntervalInBackground: true,
    },
  );

  const dnsProviderQuery = api.domain.getDnsProvider.useQuery(
    { id: Number(domainId) },
    { staleTime: 5 * 60 * 1000 },
  );
  const isCloudflare = dnsProviderQuery.data?.provider === "cloudflare";
  const autoSetupQuery = api.domain.getAutoSetup.useQuery(
    { id: Number(domainId) },
    { staleTime: 5 * 60 * 1000 },
  );
  const autoSetup = autoSetupQuery.data?.available ? autoSetupQuery.data : null;

  // The DNS provider sends the customer back here with ?autosetup=done after they approve the records.
  const returnedFromAutoSetup = React.useRef(false);
  React.useEffect(() => {
    if (returnedFromAutoSetup.current) {
      return;
    }

    const params = new URLSearchParams(window.location.search);

    if (params.get("autosetup") !== "done") {
      return;
    }

    returnedFromAutoSetup.current = true;
    toast.success("DNS records were sent to your provider. Verifying now...");
    window.history.replaceState(null, "", window.location.pathname);
    verifyQuery.mutate(
      { id: Number(domainId) },
      { onSettled: () => domainQuery.refetch() },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCopyAllRecords = async () => {
    const records = domainQuery.data?.dnsRecords ?? [];

    try {
      await navigator.clipboard.writeText(formatDnsRecordsForCopy(records));
      toast.success("All DNS records copied");
    } catch {
      toast.error("Could not copy. Copy the records one by one instead.");
    }
  };

  const verifyQuery = api.domain.startVerification.useMutation();

  const handleVerify = () => {
    verifyQuery.mutate(
      { id: Number(domainId) },
      {
        onSettled: () => {
          domainQuery.refetch();
        },
      },
    );
  };

  return (
    <div>
      {domainQuery.isLoading ? (
        <p>Loading...</p>
      ) : (
        <div className="flex flex-col gap-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center  gap-4">
              {/* <div className="flex items-center gap-4">
              <H1>{domainQuery.data?.name}</H1>
            </div> */}
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link href="/domains" className="text-lg">
                        Domains
                      </Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="text-lg" />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="text-lg ">
                      {domainQuery.data?.name}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>

              <div className="">
                <DomainStatusBadge
                  status={domainQuery.data?.status || DomainStatus.NOT_STARTED}
                />
              </div>
            </div>
            <div className="flex gap-4">
              <div>
                <Button variant="outline" onClick={handleVerify}>
                  {domainQuery.data?.isVerifying
                    ? "Verifying..."
                    : domainQuery.data?.status === DomainStatus.SUCCESS
                      ? "Verify again"
                      : "Verify domain"}
                </Button>
              </div>
              {domainQuery.data ? (
                <SendTestMail domain={domainQuery.data} />
              ) : null}
            </div>
          </div>

          <div className=" border rounded-lg p-4 shadow">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-xl">DNS records</p>
                {isCloudflare ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    This domain uses Cloudflare. Open the DNS page, choose{" "}
                    {dnsProviderQuery.data?.registrableDomain ?? "your domain"},
                    then add the records below.
                  </p>
                ) : null}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyAllRecords}
                  disabled={!domainQuery.data?.dnsRecords?.length}
                >
                  Copy all records
                </Button>
                {autoSetup ? (
                  <Button size="sm" asChild>
                    <a href={autoSetup.applyUrl}>
                      Set up automatically with {autoSetup.providerName}
                    </a>
                  </Button>
                ) : null}
                {isCloudflare ? (
                  <Button size="sm" variant={autoSetup ? "outline" : "default"} asChild>
                    <a
                      href={CLOUDFLARE_DNS_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open Cloudflare DNS
                    </a>
                  </Button>
                ) : null}
              </div>
            </div>
            <Table className="mt-2">
              <TableHeader className="">
                <TableRow className="">
                  <TableHead className="rounded-tl-md px-3">Type</TableHead>
                  <TableHead className="px-3">Name</TableHead>
                  <TableHead className="px-3">Content</TableHead>
                  <TableHead className="rounded-tr-md px-3">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(domainQuery.data?.dnsRecords ?? []).map((record) => {
                  const key = `${record.type}-${record.name}`;

                  return (
                    <TableRow key={key}>
                      <TableCell className="px-3 py-3 align-top">
                        <div className="font-mono">{record.type}</div>
                        {record.priority ? (
                          <div className="text-xs text-muted-foreground">
                            Priority {record.priority}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell className="px-3 py-3 align-top">
                        <div title={record.name}>
                          <TextWithCopyButton
                            value={record.name}
                            className="max-w-[160px] truncate lg:max-w-[240px]"
                          />
                        </div>
                        {record.recommended ? (
                          <div className="text-xs text-muted-foreground">
                            Recommended
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell className="px-3 py-3 align-top">
                        <div title={record.value}>
                          <TextWithCopyButton
                            value={record.value}
                            className="max-w-[180px] truncate lg:max-w-[280px] xl:max-w-[360px]"
                          />
                        </div>
                        <div className="text-xs text-muted-foreground">
                          TTL {record.ttl}
                        </div>
                      </TableCell>
                      <TableCell className="px-3 py-3 align-top">
                        <DnsVerificationStatus status={record.status} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {domainQuery.data ? (
            <DomainSettings domain={domainQuery.data} />
          ) : null}
        </div>
      )}
    </div>
  );
}

const DomainSettings: React.FC<{ domain: DomainResponse }> = ({ domain }) => {
  const updateDomain = api.domain.updateDomain.useMutation();
  const utils = api.useUtils();

  const [clickTracking, setClickTracking] = React.useState(
    domain.clickTracking,
  );
  const [openTracking, setOpenTracking] = React.useState(domain.openTracking);

  function handleClickTrackingChange() {
    setClickTracking(!clickTracking);
    updateDomain.mutate(
      { id: domain.id, clickTracking: !clickTracking },
      {
        onSuccess: () => {
          utils.domain.invalidate();
          toast.success("Click tracking updated");
        },
      },
    );
  }

  function handleOpenTrackingChange() {
    setOpenTracking(!openTracking);
    updateDomain.mutate(
      { id: domain.id, openTracking: !openTracking },
      {
        onSuccess: () => {
          utils.domain.invalidate();
          toast.success("Open tracking updated");
        },
      },
    );
  }
  return (
    <div className="rounded-lg shadow p-4 border flex flex-col gap-6">
      <p className="font-semibold text-xl">Settings</p>
      <div className="flex flex-col gap-1">
        <div className="font-semibold">Click tracking</div>
        <p className=" text-muted-foreground text-sm">
          Track any links in your emails content.{" "}
        </p>
        <Switch
          checked={clickTracking}
          onCheckedChange={handleClickTrackingChange}
          className="data-[state=checked]:bg-success"
        />
      </div>

      <div className="flex flex-col gap-1">
        <div className="font-semibold">Open tracking</div>
        <p className=" text-muted-foreground text-sm">
          F14 adds a tracking pixel to every email you send. This allows you
          to see how many people open your emails. This will affect the delivery
          rate of your emails.
        </p>
        <Switch
          checked={openTracking}
          onCheckedChange={handleOpenTrackingChange}
          className="data-[state=checked]:bg-success"
        />
      </div>

      <div className="flex flex-col gap-2">
        <p className="font-semibold text-lg text-destructive">Danger</p>

        <p className="text-destructive text-sm font-semibold">
          Deleting a domain will stop sending emails with this domain.
        </p>
        <DeleteDomain domain={domain} />
      </div>
    </div>
  );
};

const DnsVerificationStatus: React.FC<{ status: DomainStatus }> = ({ status }) => {
  return (
    <StatusDot tone={domainStatusTone(status)}>
      {domainStatusLabel(status)}
    </StatusDot>
  );
};
