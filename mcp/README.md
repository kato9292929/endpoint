# x402-endpoint-mcp

An [MCP](https://modelcontextprotocol.io) server for the **x402 Endpoint**
catalog — a cross-directory index of x402 ecosystem endpoints. Gives an agent
read-only access to the catalog over four tools.

## Tools

| Tool | Arguments | Description |
| --- | --- | --- |
| `list_endpoints` | `category?`, `network?`, `protocol?`, `source?` | List endpoints, optionally filtered (AND-combined) |
| `search_endpoints` | `query` | Fuzzy-search by name / description / URL |
| `get_endpoint` | `id` | Fetch a single endpoint by id |
| `get_stats` | — | Aggregate counts by source, category, network, protocol |

It is backed by the public catalog API (no key required). Point it at a
different deployment with `X402_ENDPOINT_API_BASE` (default
`https://x402endpoint.com`).

## Install / run

```bash
# run straight from npm
npx -y x402-endpoint-mcp

# or build from source
npm install && npm run build && npm start
```

## Client configuration

### Claude Desktop / Cursor

Add to `claude_desktop_config.json` (Claude Desktop) or `~/.cursor/mcp.json`
(Cursor):

```json
{
  "mcpServers": {
    "x402-endpoint": {
      "command": "npx",
      "args": ["-y", "x402-endpoint-mcp"],
      "env": { "X402_ENDPOINT_API_BASE": "https://x402endpoint.com" }
    }
  }
}
```

### Claude Code (CLI)

```bash
claude mcp add x402-endpoint -- npx -y x402-endpoint-mcp
```

### ChatGPT / other MCP clients

Any client that speaks MCP over stdio can launch `npx -y x402-endpoint-mcp`.
For HTTP-only clients, call the REST API directly — see
`https://x402endpoint.com/api/openapi.json`.

## Example prompts

- "List all x402 endpoints in the `intelligence` category on Base."
- "Search the x402 catalog for stock data APIs."
- "What are the catalog stats — how many endpoints per source?"

## License

MIT
