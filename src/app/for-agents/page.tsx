import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "For Agents — x402 Endpoint",
  description:
    "Programmatic access to the x402 Endpoint catalog: a no-auth REST API, an OpenAPI 3.1 spec, and an MCP server.",
};

function Code({ children }: { children: React.ReactNode }) {
  return (
    <pre className="rounded-lg border border-border bg-surface p-4 text-xs overflow-x-auto">
      <code>{children}</code>
    </pre>
  );
}

function Endpoint({ method, path, desc }: { method: string; path: string; desc: string }) {
  return (
    <div className="flex flex-wrap items-baseline gap-2 text-sm">
      <span className="font-mono text-[11px] rounded bg-black/40 border border-border px-1.5 py-0.5 text-accent">
        {method}
      </span>
      <code className="font-mono">{path}</code>
      <span className="text-muted">— {desc}</span>
    </div>
  );
}

export default function ForAgentsPage() {
  return (
    <div className="max-w-2xl space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">For Agents</h1>
        <p className="text-muted text-sm">
          The whole catalog is available programmatically — no API key, no
          sign-up. Read it over REST, discover it via OpenAPI, or wire it into
          an agent with the MCP server.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">REST API</h2>
        <div className="space-y-2 rounded-lg border border-border bg-surface p-4">
          <Endpoint method="GET" path="/api/endpoints" desc="all endpoints (filterable)" />
          <Endpoint method="GET" path="/api/endpoints/:id" desc="one endpoint" />
          <Endpoint method="GET" path="/api/search?q=" desc="fuzzy search" />
          <Endpoint method="GET" path="/api/stats" desc="aggregate counts" />
          <Endpoint method="GET" path="/api/openapi.json" desc="OpenAPI 3.1 spec" />
        </div>
        <p className="text-sm text-muted">
          Filters (AND-combined) on <code>/api/endpoints</code> and{" "}
          <code>/api/search</code>: <code>category</code>, <code>network</code>,{" "}
          <code>protocol</code>, <code>source</code>. Responses are CORS-open and
          cached at the edge for a day.
        </p>
        <Code>{`# all data endpoints on Base
curl "${SITE_URL}/api/endpoints?category=data&network=Base"

# search
curl "${SITE_URL}/api/search?q=stock"

# aggregate stats
curl "${SITE_URL}/api/stats"`}</Code>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">MCP server</h2>
        <p className="text-sm text-muted">
          The <code>x402-endpoint-mcp</code> package exposes four tools —{" "}
          <code>list_endpoints</code>, <code>search_endpoints</code>,{" "}
          <code>get_endpoint</code>, <code>get_stats</code> — backed by this API.
        </p>
        <p className="text-sm text-muted">Claude Desktop / Cursor config:</p>
        <Code>{`{
  "mcpServers": {
    "x402-endpoint": {
      "command": "npx",
      "args": ["-y", "x402-endpoint-mcp"],
      "env": { "X402_ENDPOINT_API_BASE": "${SITE_URL}" }
    }
  }
}`}</Code>
        <p className="text-sm text-muted">
          See the{" "}
          <a
            className="text-accent hover:underline"
            href="https://github.com/kato9292929/endpoint/tree/main/mcp"
          >
            mcp/ package README
          </a>{" "}
          for ChatGPT and other clients.
        </p>
      </section>

      <section className="space-y-2 text-sm text-muted">
        <h2 className="text-lg font-medium text-white">Fair use</h2>
        <p>
          Free and unauthenticated. A light, best-effort per-IP rate limit
          protects the service; agents that respond to{" "}
          <code>429 / Retry-After</code> won&apos;t notice it. Please don&apos;t
          hammer the API — the full dataset is one request to{" "}
          <code>/api/endpoints</code>.
        </p>
      </section>
    </div>
  );
}
