// OpenAPI 3.1 description of the public catalog API, served at
// /api/openapi.json so agents can discover the surface programmatically.

import { SITE_URL } from "./site";
import { CATEGORIES, DIRECTORY_SOURCES } from "./types";

export function openapiSpec() {
  const Price = {
    type: "object",
    properties: {
      amount: { type: "number" },
      currency: { type: "string", example: "USDC" },
      unit: { type: "string", example: "per-call" },
    },
    required: ["amount", "currency", "unit"],
  };

  const Endpoint = {
    type: "object",
    properties: {
      id: { type: "string" },
      url: { type: "string", format: "uri" },
      name: { type: "string" },
      description: { type: "string" },
      category: { type: "string", enum: CATEGORIES },
      price: Price,
      networks: { type: "array", items: { type: "string" } },
      protocols: { type: "array", items: { type: "string" } },
      source: {
        type: "array",
        items: { type: "string", enum: DIRECTORY_SOURCES },
      },
      source_url: { type: "string", format: "uri" },
      last_seen: { type: "string", format: "date-time" },
    },
    required: [
      "id",
      "url",
      "name",
      "description",
      "category",
      "networks",
      "protocols",
      "source",
      "source_url",
      "last_seen",
    ],
  };

  const filterParams = [
    { name: "category", in: "query", schema: { type: "string", enum: CATEGORIES } },
    { name: "network", in: "query", schema: { type: "string" }, example: "Base" },
    { name: "protocol", in: "query", schema: { type: "string" }, example: "x402" },
    {
      name: "source",
      in: "query",
      schema: { type: "string", enum: DIRECTORY_SOURCES },
    },
  ];

  return {
    openapi: "3.1.0",
    info: {
      title: "x402 Endpoint Catalog API",
      version: "1.0.0",
      description:
        "Read-only catalog of x402 ecosystem endpoints aggregated across directories. No authentication required.",
    },
    servers: [{ url: SITE_URL }],
    paths: {
      "/api/endpoints": {
        get: {
          operationId: "listEndpoints",
          summary: "List endpoints, optionally filtered",
          parameters: filterParams,
          responses: {
            "200": {
              description: "Matching endpoints",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      generated_at: { type: "string", format: "date-time" },
                      count: { type: "integer" },
                      endpoints: { type: "array", items: Endpoint },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/api/endpoints/{id}": {
        get: {
          operationId: "getEndpoint",
          summary: "Get a single endpoint by id",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: {
            "200": {
              description: "The endpoint",
              content: { "application/json": { schema: Endpoint } },
            },
            "404": { description: "Not found" },
          },
        },
      },
      "/api/search": {
        get: {
          operationId: "searchEndpoints",
          summary: "Fuzzy-search endpoints",
          parameters: [
            { name: "q", in: "query", required: true, schema: { type: "string" } },
            ...filterParams,
          ],
          responses: {
            "200": {
              description: "Search results",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      query: { type: "string" },
                      count: { type: "integer" },
                      endpoints: { type: "array", items: Endpoint },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/api/stats": {
        get: {
          operationId: "getStats",
          summary: "Aggregate catalog statistics",
          responses: {
            "200": {
              description: "Counts by source, category, network, protocol",
              content: { "application/json": { schema: { type: "object" } } },
            },
          },
        },
      },
    },
    components: { schemas: { Endpoint, Price } },
  } as const;
}
