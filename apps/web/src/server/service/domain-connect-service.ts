import dns from "dns";
import { DomainStatus, type Domain } from "@prisma/client";
import { env } from "~/env";
import { APP_SETTING_KEYS } from "~/lib/app-settings";
import {
  buildSignedQuery,
  buildTemplateCheckUrl,
  findTrustedProvider,
  parseDiscoveryAuthority,
  splitDomainName,
  validateSettings,
  type DomainConnectSettings,
} from "~/lib/domain-connect";
import { buildApplyUrl } from "~/server/domain-connect/sign";
import { logger } from "../logger/log";
import { withCache } from "../redis";
import { AppSettingsService } from "./app-settings-service";

const DISCOVERY_CACHE_TTL_SECONDS = 5 * 60;
const REQUEST_TIMEOUT_MS = 5000;

type Discovery =
  | { supported: false }
  | ({ supported: true } & DomainConnectSettings);

export type AutoSetup =
  | { available: false }
  | { available: true; providerName: string; applyUrl: string };

async function readDiscoveryTxt(rootDomain: string): Promise<string | null> {
  const resolver = new dns.promises.Resolver({ timeout: 3000, tries: 1 });

  try {
    const records = await resolver.resolveTxt(`_domainconnect.${rootDomain}`);
    return records[0]?.join("") ?? null;
  } catch {
    return null;
  }
}

async function fetchJson(url: string): Promise<unknown | null> {
  const response = await fetch(url, {
    redirect: "error",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: { accept: "application/json" },
  });

  return response.ok ? ((await response.json()) as unknown) : null;
}

async function discover(rootDomain: string): Promise<Discovery> {
  const txt = await readDiscoveryTxt(rootDomain);
  const authority = txt ? parseDiscoveryAuthority(txt) : null;
  const provider = authority ? findTrustedProvider(authority.host) : null;

  if (!authority || !provider) {
    return { supported: false };
  }

  try {
    const settings = validateSettings(
      await fetchJson(`https://${authority.authority}/v2/${rootDomain}/settings`),
      provider,
    );

    if (!settings) {
      return { supported: false };
    }

    // A 404 here simply means the provider has not published the F14 template yet.
    const template = await fetch(buildTemplateCheckUrl(settings.urlAPI), {
      redirect: "error",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    return template.ok ? { supported: true, ...settings } : { supported: false };
  } catch (err) {
    logger.warn({ err, rootDomain }, "[DomainConnect]: Discovery failed");
    return { supported: false };
  }
}

export async function discoverDomainConnect(
  rootDomain: string,
): Promise<Discovery> {
  return withCache(`domain-connect:${rootDomain}`, () => discover(rootDomain), {
    ttlSeconds: DISCOVERY_CACHE_TTL_SECONDS,
  });
}

/**
 * Returns a signed link that lets the customer approve the DNS records at their provider.
 * Everything is off until an admin turns the switch on, so the default answer is "unavailable".
 */
export async function getAutoSetupForDomain(domain: Domain): Promise<AutoSetup> {
  const unavailable = { available: false } as const;

  if (domain.status === DomainStatus.SUCCESS) {
    return unavailable;
  }

  if (!env.DOMAIN_CONNECT_PRIVATE_KEY || !env.DOMAIN_CONNECT_KEY_HOST) {
    return unavailable;
  }

  const enabled = await AppSettingsService.isEnabled(
    APP_SETTING_KEYS.DOMAIN_CONNECT_ENABLED,
  );

  if (!enabled) {
    return unavailable;
  }

  const parts = splitDomainName(domain.name);

  if (!parts) {
    return unavailable;
  }

  const discovery = await discoverDomainConnect(parts.domain);

  if (!discovery.supported) {
    return unavailable;
  }

  const query = buildSignedQuery({
    domain: parts.domain,
    host: parts.host,
    region: domain.region,
    dkimselector: domain.dkimSelector ?? "usesend",
    dkimkey: domain.publicKey,
    redirect_uri: `${env.NEXTAUTH_URL}/domains/${domain.id}?autosetup=done`,
  });

  return {
    available: true,
    providerName: discovery.providerName,
    applyUrl: buildApplyUrl({
      urlSyncUX: discovery.urlSyncUX,
      query,
      keyHost: env.DOMAIN_CONNECT_KEY_HOST,
      privateKeyBase64: env.DOMAIN_CONNECT_PRIVATE_KEY,
    }),
  };
}
