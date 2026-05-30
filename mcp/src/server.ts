#!/usr/bin/env node
/**
 * MCP server for the x402 Endpoint catalog.
 *
 * Exposes four read-only tools backed by the public REST API:
 *   list_endpoints, search_endpoints, get_endpoint, get_stats
 *
 * Configure the catalog base URL with X402_ENDPOINT_API_BASE
 * (defaults to https://x402endpoint.com).
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API_BASE = (
  process.env.X402_ENDPOINT_API_BASE ?? "https://x402endpoint.com"
).replace(/\/$/, "");

async function api(path: string): Promise<unknown> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`x402 Endpoint API ${path} returned HTTP ${res.status}`);
  }
  return res.json();
}

function result(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

const server = new McpServer({ name: "x402-endpoint", version: "1.0.0" });

server.tool(
  "list_endpoints",
  "List x402 ecosystem endpoints from the catalog, optionally filtered by category, network, protocol, and/or source.",
  {
    category: z.string().optional().describe("e.g. data, intelligence, oracle, compliance, compute"),
    network: z.string().optional().describe("e.g. Base, Solana"),
    protocol: z.string().optional().describe("e.g. x402"),
    source: z.string().optional().describe("e.g. x402-inc, x402scan, onyx-bazaar"),
  },
  async (args) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(args)) if (v) qs.set(k, String(v));
    const q = qs.toString();
    return result(await api(`/api/endpoints${q ? `?${q}` : ""}`));
  },
);

server.tool(
  "search_endpoints",
  "Fuzzy-search the catalog by name, description, or URL.",
  { query: z.string().describe("Free-text search query") },
  async ({ query }) =>
    result(await api(`/api/search?q=${encodeURIComponent(query)}`)),
);

server.tool(
  "get_endpoint",
  "Get a single endpoint by its catalog id.",
  { id: z.string().describe("The endpoint id (from list/search results)") },
  async ({ id }) =>
    result(await api(`/api/endpoints/${encodeURIComponent(id)}`)),
);

server.tool(
  "get_stats",
  "Get aggregate catalog statistics (totals by source, category, network, protocol).",
  {},
  async () => result(await api("/api/stats")),
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`x402-endpoint MCP server running (API: ${API_BASE})`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
