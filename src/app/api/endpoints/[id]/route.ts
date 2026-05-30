import { apiJson, apiError, OPTIONS } from "@/lib/api";
import { getEndpointById } from "@/lib/data";

export { OPTIONS };

// GET /api/endpoints/:id — a single endpoint by its catalog id.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const endpoint = getEndpointById(id);
  if (!endpoint) return apiError("Endpoint not found", 404);
  return apiJson(endpoint);
}
