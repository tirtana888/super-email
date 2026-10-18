import { createVerify, generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  buildApplyBaseUrl,
  buildSignedQuery,
  buildTemplateCheckUrl,
  encodeParam,
  findTrustedProvider,
  parseDiscoveryAuthority,
  splitDomainName,
  validateSettings,
} from "./domain-connect";
import { buildApplyUrl } from "../server/domain-connect/sign";

const cloudflare = findTrustedProvider("api.cloudflare.com")!;

describe("splitDomainName", () => {
  it("returns the registrable domain with no host for a root domain", () => {
    expect(splitDomainName("example.com")).toEqual({
      domain: "example.com",
      host: null,
    });
  });

  it("turns the subdomain into the host", () => {
    expect(splitDomainName("send.example.com")).toEqual({
      domain: "example.com",
      host: "send",
    });
    expect(splitDomainName("a.b.example.co.id")).toEqual({
      domain: "example.co.id",
      host: "a.b",
    });
  });

  it("rejects names that are not domains", () => {
    expect(splitDomainName("localhost")).toBeNull();
    expect(splitDomainName("127.0.0.1")).toBeNull();
  });
});

describe("buildSignedQuery", () => {
  it("sorts by encoded name and encodes names and values", () => {
    expect(
      buildSignedQuery({
        region: "ap-southeast-3",
        domain: "example.com",
        dkimkey: "ab+/=",
      }),
    ).toBe("dkimkey=ab%2B%2F%3D&domain=example.com&region=ap-southeast-3");
  });

  it("leaves out empty and missing values", () => {
    expect(buildSignedQuery({ domain: "example.com", host: null, x: "" })).toBe(
      "domain=example.com",
    );
  });

  it("escapes the characters encodeURIComponent keeps", () => {
    expect(encodeParam("a(b)*'!")).toBe("a%28b%29%2A%27%21");
  });
});

describe("parseDiscoveryAuthority", () => {
  it("accepts an authority with an optional path", () => {
    expect(
      parseDiscoveryAuthority("api.cloudflare.com/client/v4/dns/domainconnect"),
    ).toEqual({
      host: "api.cloudflare.com",
      authority: "api.cloudflare.com/client/v4/dns/domainconnect",
    });
  });

  it("rejects schemes, queries, fragments and whitespace", () => {
    expect(parseDiscoveryAuthority("https://evil.test")).toBeNull();
    expect(parseDiscoveryAuthority("evil.test?x=1")).toBeNull();
    expect(parseDiscoveryAuthority("evil.test#x")).toBeNull();
    expect(parseDiscoveryAuthority("evil.test /x")).toBeNull();
    expect(parseDiscoveryAuthority("")).toBeNull();
  });
});

describe("findTrustedProvider", () => {
  it("only trusts the hosts we have a template with", () => {
    expect(findTrustedProvider("api.cloudflare.com")?.name).toBe("Cloudflare");
    expect(findTrustedProvider("api.cloudflare.com.evil.test")).toBeNull();
    expect(findTrustedProvider("169.254.169.254")).toBeNull();
    expect(findTrustedProvider("internal.service")).toBeNull();
  });
});

describe("validateSettings", () => {
  const good = {
    providerName: "cloudflare",
    providerDisplayName: "Cloudflare",
    urlSyncUX: "https://dash.cloudflare.com/domainconnect",
    urlAPI: "https://api.cloudflare.com/client/v4/dns/domainconnect/",
  };

  it("accepts Cloudflare's real settings shape and trims trailing slashes", () => {
    expect(validateSettings(good, cloudflare)).toEqual({
      providerName: "Cloudflare",
      urlSyncUX: "https://dash.cloudflare.com/domainconnect",
      urlAPI: "https://api.cloudflare.com/client/v4/dns/domainconnect",
    });
  });

  it("rejects other hosts, plain http, queries and fragments", () => {
    expect(
      validateSettings({ ...good, urlSyncUX: "https://evil.test/x" }, cloudflare),
    ).toBeNull();
    expect(
      validateSettings(
        { ...good, urlSyncUX: "https://dash.cloudflare.com.evil.test/x" },
        cloudflare,
      ),
    ).toBeNull();
    expect(
      validateSettings({ ...good, urlAPI: "http://api.cloudflare.com/x" }, cloudflare),
    ).toBeNull();
    expect(
      validateSettings({ ...good, urlAPI: "https://api.cloudflare.com/x?a=1" }, cloudflare),
    ).toBeNull();
    expect(validateSettings(null, cloudflare)).toBeNull();
    expect(validateSettings({}, cloudflare)).toBeNull();
  });
});

describe("template urls", () => {
  it("point at the F14 template", () => {
    expect(buildTemplateCheckUrl("https://api.cloudflare.com/x")).toBe(
      "https://api.cloudflare.com/x/v2/domainTemplates/providers/f14.dev/services/email-sending",
    );
    expect(buildApplyBaseUrl("https://dash.cloudflare.com/domainconnect")).toBe(
      "https://dash.cloudflare.com/domainconnect/v2/domainTemplates/providers/f14.dev/services/email-sending/apply",
    );
  });
});

describe("buildApplyUrl", () => {
  const { publicKey, privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  const privateKeyBase64 = Buffer.from(privateKey, "utf8").toString("base64");

  const query = buildSignedQuery({
    domain: "example.com",
    host: "send",
    region: "ap-southeast-3",
    dkimselector: "f14",
    dkimkey: "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A+/=",
    redirect_uri: "https://app.f14.dev/domains/7?autosetup=done",
  });

  const url = new URL(
    buildApplyUrl({
      urlSyncUX: "https://dash.cloudflare.com/domainconnect",
      query,
      keyHost: "_dcpubkeyv1",
      privateKeyBase64,
    }),
  );

  it("targets the apply endpoint of the F14 template", () => {
    expect(url.origin + url.pathname).toBe(
      "https://dash.cloudflare.com/domainconnect/v2/domainTemplates/providers/f14.dev/services/email-sending/apply",
    );
  });

  it("puts key and sig last", () => {
    const names = [...url.searchParams.keys()];

    expect(names.slice(-2)).toEqual(["key", "sig"]);
    expect(url.searchParams.get("key")).toBe("_dcpubkeyv1");
  });

  it("keeps the signed query unchanged and sorted before key and sig", () => {
    const raw = url.search.slice(1);

    expect(raw.startsWith(`${query}&key=`)).toBe(true);
    const names = query.split("&").map((pair) => pair.split("=")[0]!);

    expect(names).toEqual([...names].sort());
  });

  it("carries a signature that verifies with the public key", () => {
    const signature = url.searchParams.get("sig")!;
    const verified = createVerify("RSA-SHA256")
      .update(query)
      .verify(publicKey, signature, "base64");

    expect(verified).toBe(true);
  });

  it("fails verification when any signed value changes", () => {
    const signature = url.searchParams.get("sig")!;
    const tampered = query.replace("example.com", "evil.com");
    const verified = createVerify("RSA-SHA256")
      .update(tampered)
      .verify(publicKey, signature, "base64");

    expect(verified).toBe(false);
  });
});
