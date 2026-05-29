import { notFound } from "next/navigation";
import { EndpointGrid } from "@/components/EndpointGrid";
import { getByCategory } from "@/lib/data";
import { CATEGORIES, CATEGORY_LABELS, type Category } from "@/lib/types";

export const revalidate = 86400;

export function generateStaticParams() {
  return CATEGORIES.map((name) => ({ name }));
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const category = name as Category;
  if (!CATEGORIES.includes(category)) notFound();

  const endpoints = getByCategory(category);
  return (
    <EndpointGrid
      title={`Category: ${CATEGORY_LABELS[category]}`}
      subtitle={`${endpoints.length} endpoint(s)`}
      endpoints={endpoints}
    />
  );
}
