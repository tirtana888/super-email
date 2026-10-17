export type DnsProvider = "cloudflare" | "other" | "unknown";

// Cloudflare documents this `?to=` form in its own docs; it is a dashboard convention rather than a versioned API.
export const CLOUDFLARE_DNS_URL =
  "https://dash.cloudflare.com/?to=/:account/:zone/dns/records";

export function isCloudflareNameserver(nameserver: string): boolean {
  return nameserver
    .trim()
    .toLowerCase()
    .replace(/\.$/, "")
    .endsWith(".ns.cloudflare.com");
}

export function detectDnsProvider(nameservers: string[]): DnsProvider {
  if (nameservers.length === 0) {
    return "unknown";
  }

  return nameservers.some(isCloudflareNameserver) ? "cloudflare" : "other";
}

type CopyableRecord = {
  type: string;
  name: string;
  value: string;
  ttl?: string | null;
  priority?: string | null;
};

/** One block per record, so every value can be pasted straight into a DNS form. */
export function formatDnsRecordsForCopy(records: CopyableRecord[]): string {
  return records
    .map((record) => {
      const lines = [
        `Type: ${record.type}`,
        `Name: ${record.name}`,
        `Content: ${record.value}`,
      ];

      if (record.priority) {
        lines.push(`Priority: ${record.priority}`);
      }

      if (record.ttl) {
        lines.push(`TTL: ${record.ttl}`);
      }

      return lines.join("\n");
    })
    .join("\n\n");
}
