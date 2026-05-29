import { notFound } from "next/navigation";
import { EndpointGrid } from "@/components/EndpointGrid";
import { getBySource } from "@/lib/data";
import {
  DIRECTORY_META,
  DIRECTORY_SOURCES,
  type DirectorySource,
} from "@/lib/types";

export const revalidate = 86400;

export function generateStaticParams() {
  return DIRECTORY_SOURCES.map((name) => ({ name }));
}

export default async function DirectoryPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const source = name as DirectorySource;
  if (!DIRECTORY_SOURCES.includes(source)) notFound();

  const meta = DIRECTORY_META[source];
  const endpoints = getBySource(source);

  return (
    <EndpointGrid
      title={`Directory: ${meta.label}`}
      subtitle={`${endpoints.length} endpoint(s) · source: ${meta.home}`}
      endpoints={endpoints}
    />
  );
}
