import * as tldts from "tldts";

export const DOMAIN_CONNECT_PROVIDER_ID = "f14.dev";
export const DOMAIN_CONNECT_SERVICE_ID = "email-sending";

/**
 * Only DNS providers we have a published template with are contacted. The TXT record that
 * announces a provider lives in the customer's zone, so it must never decide which server we call.
 */
export const TRUSTED_DNS_PROVIDERS = [
  {
    name: "Cloudflare",
    authorityHost: "api.cloudflare.com",
    hostSuffix: "cloudflare.com",
  },
] as const;

export type TrustedDnsProvider = (typeof TRUSTED_DNS_PROVIDERS)[number];

export type DomainConnectSettings = {
  providerName: string;
  urlSyncUX: string;
  urlAPI: string;
};

/** Splits "send.example.com" into the registrable domain and the subdomain used as `host`. */
export function splitDomainName(
  name: string,
): { domain: string; host: string | null } | null {
  const domain = tldts.getDomain(name);

  if (!domain) {
    return null;
  }

  const subdomain = tldts.getSubdomain(name);

  return { domain, host: subdomain ? subdomain : null };
}

/** Like encodeURIComponent, but also escapes the characters it leaves alone (RFC 3986). */
export function encodeParam(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

/**
 * Builds the query string that gets signed and sent, with names and values percent-encoded and
 * sorted by name. Sending exactly the sorted string means "as sent" and "sorted" both hold.
 */
export function buildSignedQuery(
  params: Record<string, string | null | undefined>,
): string {
  return Object.entries(params)
    .filter(
      (entry): entry is [string, string] =>
        entry[1] !== null && entry[1] !== undefined && entry[1] !== "",
    )
    .map(([name, value]) => [encodeParam(name), encodeParam(value)] as const)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([name, value]) => `${name}=${value}`)
    .join("&");
}

/**
 * The `_domainconnect` TXT value is an authority with an optional path: no scheme, query or
 * fragment. Anything else is rejected.
 */
export function parseDiscoveryAuthority(
  txt: string,
): { host: string; authority: string } | null {
  const value = txt.trim();

  if (!/^[a-z0-9.-]+(\/[A-Za-z0-9._~/-]*)?$/i.test(value)) {
    return null;
  }

  const host = value.split("/")[0]!.toLowerCase();

  return { host, authority: value.replace(/\/+$/, "") };
}

export function findTrustedProvider(host: string): TrustedDnsProvider | null {
  return (
    TRUSTED_DNS_PROVIDERS.find((provider) => provider.authorityHost === host) ??
    null
  );
}

function isSafeHttpsUrl(value: unknown, hostSuffix: string): value is string {
  if (typeof value !== "string") {
    return false;
  }

  try {
    const url = new URL(value);
    const hostMatches =
      url.hostname === hostSuffix || url.hostname.endsWith(`.${hostSuffix}`);

    return (
      url.protocol === "https:" && hostMatches && !url.search && !url.hash
    );
  } catch {
    return false;
  }
}

/** Validates the provider's settings document, returning URLs without a trailing slash. */
export function validateSettings(
  json: unknown,
  provider: TrustedDnsProvider,
): DomainConnectSettings | null {
  if (!json || typeof json !== "object") {
    return null;
  }

  const { urlSyncUX, urlAPI, providerDisplayName, providerName } = json as Record<
    string,
    unknown
  >;

  if (
    !isSafeHttpsUrl(urlSyncUX, provider.hostSuffix) ||
    !isSafeHttpsUrl(urlAPI, provider.hostSuffix)
  ) {
    return null;
  }

  return {
    providerName:
      (typeof providerDisplayName === "string" && providerDisplayName) ||
      (typeof providerName === "string" && providerName) ||
      provider.name,
    urlSyncUX: urlSyncUX.replace(/\/+$/, ""),
    urlAPI: urlAPI.replace(/\/+$/, ""),
  };
}

export function buildTemplateCheckUrl(urlAPI: string): string {
  return `${urlAPI}/v2/domainTemplates/providers/${DOMAIN_CONNECT_PROVIDER_ID}/services/${DOMAIN_CONNECT_SERVICE_ID}`;
}

export function buildApplyBaseUrl(urlSyncUX: string): string {
  return `${urlSyncUX}/v2/domainTemplates/providers/${DOMAIN_CONNECT_PROVIDER_ID}/services/${DOMAIN_CONNECT_SERVICE_ID}/apply`;
}
