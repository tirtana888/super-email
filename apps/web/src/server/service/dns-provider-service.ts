import dns from "dns";
import * as tldts from "tldts";
import { detectDnsProvider, type DnsProvider } from "~/lib/dns-provider";
import { logger } from "../logger/log";
import { withCache } from "../redis";

const CACHE_TTL_SECONDS = 10 * 60;

export type DnsProviderLookup = {
  provider: DnsProvider;
  registrableDomain: string | null;
};

async function resolveNameservers(name: string): Promise<string[]> {
  // A short timeout keeps the domain page responsive when DNS is slow or unreachable.
  const resolver = new dns.promises.Resolver({ timeout: 3000, tries: 1 });

  try {
    return await resolver.resolveNs(name);
  } catch {
    return [];
  }
}

/**
 * Looks at the nameservers of the domain (and its registrable parent) to tell which
 * DNS provider hosts it. This only affects which helper buttons the UI shows.
 */
export async function lookupDnsProvider(
  domainName: string,
): Promise<DnsProviderLookup> {
  const registrableDomain = tldts.getDomain(domainName);
  const candidates = [...new Set([domainName, registrableDomain])].filter(
    (value): value is string => Boolean(value),
  );

  return withCache(
    `dns-provider:${domainName}`,
    async () => {
      for (const candidate of candidates) {
        const nameservers = await resolveNameservers(candidate);

        if (nameservers.length > 0) {
          return { provider: detectDnsProvider(nameservers), registrableDomain };
        }
      }

      logger.info({ domainName }, "[DnsProvider]: No nameservers found");
      return { provider: "unknown" as const, registrableDomain };
    },
    { ttlSeconds: CACHE_TTL_SECONDS },
  );
}
