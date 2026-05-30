// Canonical site URL, used for OpenAPI `servers`, docs examples, and the MCP
// default base. Override with NEXT_PUBLIC_SITE_URL at build time.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://x402endpoint.com"
).replace(/\/$/, "");
