import { describe, expect, it } from "vitest";
import {
  CLOUDFLARE_DNS_URL,
  detectDnsProvider,
  formatDnsRecordsForCopy,
  isCloudflareNameserver,
} from "./dns-provider";

describe("isCloudflareNameserver", () => {
  it("recognises Cloudflare nameservers in any case and with a trailing dot", () => {
    expect(isCloudflareNameserver("ada.ns.cloudflare.com")).toBe(true);
    expect(isCloudflareNameserver("BOB.NS.CLOUDFLARE.COM.")).toBe(true);
  });

  it("does not match lookalikes", () => {
    expect(isCloudflareNameserver("ns1.example.com")).toBe(false);
    expect(isCloudflareNameserver("ns.cloudflare.com.evil.test")).toBe(false);
    expect(isCloudflareNameserver("cloudflare.com")).toBe(false);
  });
});

describe("detectDnsProvider", () => {
  it("is unknown when no nameservers were found", () => {
    expect(detectDnsProvider([])).toBe("unknown");
  });

  it("is cloudflare when the zone uses Cloudflare nameservers", () => {
    expect(
      detectDnsProvider(["ada.ns.cloudflare.com", "bob.ns.cloudflare.com"]),
    ).toBe("cloudflare");
  });

  it("is other for any other provider", () => {
    expect(detectDnsProvider(["ns1.digitalocean.com"])).toBe("other");
  });
});

describe("formatDnsRecordsForCopy", () => {
  it("writes one labelled block per record", () => {
    const text = formatDnsRecordsForCopy([
      {
        type: "MX",
        name: "mail",
        value: "feedback-smtp.ap-southeast-3.amazonses.com",
        ttl: "Auto",
        priority: "10",
      },
      { type: "TXT", name: "_dmarc", value: "v=DMARC1; p=none;", ttl: "Auto" },
    ]);

    expect(text).toBe(
      [
        "Type: MX",
        "Name: mail",
        "Content: feedback-smtp.ap-southeast-3.amazonses.com",
        "Priority: 10",
        "TTL: Auto",
        "",
        "Type: TXT",
        "Name: _dmarc",
        "Content: v=DMARC1; p=none;",
        "TTL: Auto",
      ].join("\n"),
    );
  });

  it("skips priority when a record has none", () => {
    expect(
      formatDnsRecordsForCopy([{ type: "TXT", name: "x", value: "y", priority: null }]),
    ).toBe("Type: TXT\nName: x\nContent: y");
  });
});

describe("CLOUDFLARE_DNS_URL", () => {
  it("points at the DNS records page of the dashboard", () => {
    expect(CLOUDFLARE_DNS_URL.startsWith("https://dash.cloudflare.com/")).toBe(true);
    expect(CLOUDFLARE_DNS_URL.endsWith("/dns/records")).toBe(true);
  });
});
