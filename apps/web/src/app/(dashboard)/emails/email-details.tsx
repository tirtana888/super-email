"use client";

import { UAParser } from "ua-parser-js";
import { api } from "~/trpc/react";
import { EmailStatusBadge, EmailStatusIcon } from "./email-status-badge";
import { EmailStatus } from "@prisma/client";
import { JsonValue } from "@prisma/client/runtime/library";
import {
  SesBounce,
  SesClick,
  SesComplaint,
  SesDeliveryDelay,
  SesOpen,
} from "~/types/aws-types";
import {
  BOUNCE_ERROR_MESSAGES,
  COMPLAINT_ERROR_MESSAGES,
  DELIVERY_DELAY_ERRORS,
} from "@usesend/lib/src/constants/ses-errors";
import { getEmailPreviewSrcDoc } from "~/lib/email-preview";
import {
  formatDashboardTimeLong,
  formatElapsed,
} from "~/lib/format-time";
import { TextWithCopyButton } from "@usesend/ui/src/text-with-copy";
import CancelEmail from "./cancel-email";
import { useEffect, useState } from "react";

// Statuses that mean something went wrong; the newest one is explained at the top.
const PROBLEM_STATUSES: EmailStatus[] = [
  "BOUNCED",
  "COMPLAINED",
  "FAILED",
  "REJECTED",
  "RENDERING_FAILURE",
  "DELIVERY_DELAYED",
  "SUPPRESSED",
];

export default function EmailDetails({ emailId }: { emailId: string }) {
  const emailQuery = api.email.getEmail.useQuery({ id: emailId });
  const { data: domains } = api.domain.domains.useQuery();
  const { data: apiKeys } = api.apiKey.getApiKeys.useQuery();
  const [tab, setTab] = useState<"events" | "content">("events");

  const email = emailQuery.data;

  if (emailQuery.isLoading) {
    return <div className="px-4 py-6 text-sm text-muted-foreground">Loading email...</div>;
  }

  if (!email) {
    return <div className="px-4 py-6 text-sm text-muted-foreground">Email not found.</div>;
  }

  const events = [...email.emailEvents].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  const problem = [...events]
    .reverse()
    .find((evt) => PROBLEM_STATUSES.includes(evt.status));
  const domainName = email.domainId
    ? domains?.find((d) => d.id === email.domainId)?.name
    : undefined;
  const apiKeyName = email.apiId
    ? apiKeys?.find((k) => k.id === email.apiId)?.name
    : undefined;

  return (
    <div className="flex h-full flex-col gap-5 overflow-auto px-1 pb-6 no-scrollbar">
      <header className="flex flex-col gap-2 border-b pb-4 pr-8">
        <div className="flex items-center justify-between gap-3">
          <EmailStatusBadge status={email.latestStatus} />
          <TextWithCopyButton
            value={email.id}
            className="font-mono text-xs text-muted-foreground"
          />
        </div>
        <h2 className="text-base font-semibold leading-snug text-foreground">
          {email.subject || "(no subject)"}
        </h2>
      </header>

      {problem ? <ProblemCallout status={problem.status} data={problem.data} /> : null}

      {email.latestStatus === "SCHEDULED" && email.scheduledAt ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/40 px-3 py-2.5 text-[13px]">
          <span>
            Scheduled for{" "}
            <span className="font-medium">{formatDashboardTimeLong(email.scheduledAt)}</span>
          </span>
          <CancelEmail emailId={emailId} />
        </div>
      ) : null}

      <dl className="grid grid-cols-[110px_minmax(0,1fr)] gap-x-3 gap-y-2 text-[13px]">
        <DetailRow label="To" value={email.to.join(", ")} />
        {email.cc.length ? <DetailRow label="Cc" value={email.cc.join(", ")} /> : null}
        {email.bcc.length ? <DetailRow label="Bcc" value={email.bcc.join(", ")} /> : null}
        <DetailRow label="From" value={email.from} />
        {email.replyTo.length ? (
          <DetailRow label="Reply to" value={email.replyTo.join(", ")} />
        ) : null}
        <DetailRow label="Domain" value={domainName ?? "—"} />
        <DetailRow
          label="Source"
          value={
            email.campaignId
              ? "Campaign"
              : apiKeyName
                ? `API key · ${apiKeyName}`
                : email.apiId
                  ? "API key"
                  : "—"
          }
        />
        <DetailRow label="Created" value={formatDashboardTimeLong(email.createdAt)} />
        {email.sesEmailId ? (
          <>
            <dt className="text-muted-foreground">Message ID</dt>
            <dd className="min-w-0">
              <TextWithCopyButton
                value={email.sesEmailId}
                className="truncate font-mono text-xs"
              />
            </dd>
          </>
        ) : null}
      </dl>

      <div className="flex gap-1 border-b">
        {(
          [
            ["events", `Events (${events.length})`],
            ["content", "Content"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`-mb-px border-b-2 px-3 py-2 text-[13px] transition-colors ${
              tab === value
                ? "border-foreground font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "events" ? (
        events.length ? (
          <ol className="flex flex-col">
            {events.map((evt, index) => (
              <li key={`${evt.status}-${index}`} className="relative flex gap-3 pb-5 last:pb-0">
                {index < events.length - 1 ? (
                  <span
                    aria-hidden
                    className="absolute left-[9px] top-6 bottom-0 w-px bg-border"
                  />
                ) : null}
                <EmailStatusIcon status={evt.status} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[13px] font-medium">
                      {statusLabel(evt.status)}
                    </span>
                    <span className="shrink-0 font-mono text-[11.5px] text-muted-foreground">
                      {index === 0
                        ? formatDashboardTimeLong(evt.createdAt)
                        : formatElapsed(events[index - 1]!.createdAt, evt.createdAt)}
                    </span>
                  </div>
                  <div className="mt-1 text-[13px] text-muted-foreground">
                    <EmailStatusText status={evt.status} data={evt.data} />
                  </div>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-[13px] text-muted-foreground">No events yet.</p>
        )
      ) : (
        <EmailPreview html={email.html} text={email.text} />
      )}
    </div>
  );
}

function statusLabel(status: string) {
  const label = status.toLowerCase().split("_").join(" ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-foreground">{value}</dd>
    </>
  );
}

const ProblemCallout = ({
  status,
  data,
}: {
  status: EmailStatus;
  data: JsonValue;
}) => {
  let title = statusLabel(status);
  let message: string | undefined;
  let detail: string | undefined;

  if (status === "BOUNCED") {
    const bounce = data as unknown as SesBounce;
    title = `${bounce?.bounceType === "Permanent" ? "Hard" : bounce?.bounceType === "Transient" ? "Soft" : ""} bounce`.trim();
    title = title.charAt(0).toUpperCase() + title.slice(1);
    message = bounce ? getErrorMessage(bounce) : undefined;
    detail = bounce?.bouncedRecipients?.[0]?.diagnosticCode;
  } else if (status === "COMPLAINED") {
    const complaint = data as unknown as SesComplaint;
    title = "Marked as spam";
    message = getComplaintMessage(complaint?.complaintFeedbackType);
  } else if (status === "DELIVERY_DELAYED") {
    const delay = data as unknown as SesDeliveryDelay;
    title = "Delivery delayed";
    message = delay ? DELIVERY_DELAY_ERRORS[delay.delayType] : undefined;
  } else if (status === "FAILED" || status === "REJECTED" || status === "RENDERING_FAILURE") {
    const failure = data as unknown as { error?: string };
    message = failure?.error;
  } else if (status === "SUPPRESSED") {
    message =
      "Not sent because this address is on the Exclusions list after an earlier bounce or complaint.";
  }

  const warning = status === "DELIVERY_DELAYED" || status === "SUPPRESSED";

  // A thin tinted border and a status dot; no accent stripe.
  return (
    <div
      className={`rounded-md border px-3 py-2.5 text-[13px] ${
        warning ? "border-yellow/40 bg-yellow/5" : "border-red/40 bg-red/5"
      }`}
    >
      <div className="flex items-center gap-2 font-medium text-foreground">
        <span
          aria-hidden
          className={`h-[7px] w-[7px] shrink-0 rounded-full ${warning ? "bg-yellow" : "bg-red"}`}
        />
        {title}
      </div>
      {message ? <p className="mt-0.5 text-muted-foreground">{message}</p> : null}
      {detail ? (
        <p className="mt-2 break-words font-mono text-xs text-foreground/80">{detail}</p>
      ) : null}
    </div>
  );
};

const EmailPreview = ({
  html,
  text,
}: {
  html: string | null | undefined;
  text: string | null | undefined;
}) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(true);
    }, 200);

    return () => clearTimeout(timer);
  }, []);

  const srcDoc = getEmailPreviewSrcDoc(html, text);

  if (!show) {
    return <div className="h-[420px] rounded-md border bg-white" />;
  }

  if (!srcDoc) {
    return (
      <div className="flex h-[420px] items-center justify-center rounded-md border">
        <span className="text-sm text-muted-foreground">No content to preview</span>
      </div>
    );
  }

  return (
    <div className="h-[420px] overflow-hidden rounded-md border bg-white">
      <iframe className="h-full w-full" srcDoc={srcDoc} sandbox="allow-same-origin" />
    </div>
  );
};

const EmailStatusText = ({
  status,
  data,
}: {
  status: EmailStatus;
  data: JsonValue;
}) => {
  if (status === "SENT") {
    return <div>Accepted and handed to the recipient's mail server.</div>;
  } else if (status === "DELIVERED") {
    return <div>Delivered to the recipient's mail server.</div>;
  } else if (status === "DELIVERY_DELAYED") {
    const _errorData = data as unknown as SesDeliveryDelay;
    return <div>{DELIVERY_DELAY_ERRORS[_errorData.delayType]}</div>;
  } else if (status === "BOUNCED") {
    const _errorData = data as unknown as SesBounce;
    return (
      <dl className="mt-1 grid grid-cols-[90px_minmax(0,1fr)] gap-x-3 gap-y-1">
        <dt>Type</dt>
        <dd className="text-foreground">{_errorData.bounceType}</dd>
        <dt>Subtype</dt>
        <dd className="text-foreground">{_errorData.bounceSubType}</dd>
      </dl>
    );
  } else if (status === "FAILED") {
    const _errorData = data as unknown as { error: string };
    return <div>{_errorData.error}</div>;
  } else if (status === "OPENED" || status === "CLICKED") {
    const _data = data as unknown as SesOpen & Partial<SesClick>;
    const userAgent = getUserAgent(_data.userAgent);
    const client = [userAgent.browser.name, userAgent.os.name].filter(Boolean).join(" on ");
    return (
      <div className="flex flex-col gap-0.5">
        {client ? <span>{client}</span> : null}
        {status === "CLICKED" && _data.link ? (
          <span className="break-all font-mono text-xs text-foreground/80">{_data.link}</span>
        ) : null}
      </div>
    );
  } else if (status === "COMPLAINED") {
    const _errorData = data as unknown as SesComplaint;
    return <div>{getComplaintMessage(_errorData.complaintFeedbackType)}</div>;
  } else if (status === "CANCELLED") {
    return <div>This scheduled email was cancelled.</div>;
  } else if (status === "SUPPRESSED") {
    return <div>Not sent: the address is on the Exclusions list.</div>;
  } else if (status === "QUEUED") {
    return <div>Waiting to be sent.</div>;
  }

  return null;
};

const getErrorMessage = (data: SesBounce) => {
  if (data.bounceType === "Permanent") {
    return BOUNCE_ERROR_MESSAGES[data.bounceType][
      data.bounceSubType as
        | "General"
        | "NoEmail"
        | "Suppressed"
        | "OnAccountSuppressionList"
    ];
  } else if (data.bounceType === "Transient") {
    return BOUNCE_ERROR_MESSAGES[data.bounceType][
      data.bounceSubType as
        | "General"
        | "MailboxFull"
        | "MessageTooLarge"
        | "ContentRejected"
        | "AttachmentRejected"
    ];
  } else if (data.bounceType === "Undetermined") {
    return BOUNCE_ERROR_MESSAGES.Undetermined;
  }
};

const getComplaintMessage = (errorType: string | undefined) => {
  if (!errorType) return undefined;
  return COMPLAINT_ERROR_MESSAGES[
    errorType as keyof typeof COMPLAINT_ERROR_MESSAGES
  ];
};

const getUserAgent = (userAgent: string) => {
  const parser = new UAParser(userAgent);
  return {
    browser: parser.getBrowser(),
    os: parser.getOS(),
    device: parser.getDevice(),
  };
};
