import { createPrivateKey, createSign } from "node:crypto";
import { buildApplyBaseUrl, encodeParam } from "~/lib/domain-connect";

/** The private key is stored in the environment as base64 of the PEM text. */
export function decodePrivateKey(base64Pem: string): string {
  return Buffer.from(base64Pem.trim(), "base64").toString("utf8");
}

/** RS256: RSASSA-PKCS1-v1_5 with SHA-256, signature as standard Base64. */
export function signQuery(query: string, privateKeyPem: string): string {
  return createSign("RSA-SHA256")
    .update(query)
    .sign(createPrivateKey(privateKeyPem), "base64");
}

/**
 * Builds the apply link for the synchronous flow. `key` and `sig` are appended last and the
 * signed query is sent unchanged.
 */
export function buildApplyUrl(input: {
  urlSyncUX: string;
  query: string;
  keyHost: string;
  privateKeyBase64: string;
}): string {
  const signature = signQuery(
    input.query,
    decodePrivateKey(input.privateKeyBase64),
  );

  return `${buildApplyBaseUrl(input.urlSyncUX)}?${input.query}&key=${encodeParam(
    input.keyHost,
  )}&sig=${encodeURIComponent(signature)}`;
}
