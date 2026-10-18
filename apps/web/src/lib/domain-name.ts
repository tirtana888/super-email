/**
 * Domain names are case-insensitive, and AWS SES treats "Example.com" and "example.com" as the
 * same identity. Everything we store or send to SES uses this one canonical spelling.
 */
export function normalizeDomainName(name: string): string {
  return name.trim().toLowerCase().replace(/\.+$/, "");
}
