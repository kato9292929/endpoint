import { apiJson, OPTIONS } from "@/lib/api";
import { openapiSpec } from "@/lib/openapi";

export { OPTIONS };

// GET /api/openapi.json — OpenAPI 3.1 spec for the catalog API.
export function GET() {
  return apiJson(openapiSpec());
}
