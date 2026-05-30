import { notFound } from "next/navigation";
import { EndpointGrid } from "@/components/EndpointGrid";
import { getBySource } from "@/lib/data";
import {
  DIRECTORY_META,
  DIRECTORY_SOURCES,
  type DirectorySource,
} from "@/lib/types";

export const revalidate = 86400;

// A listing filtered by any source (directories and x402 Inc. alike).
// /by/x402-inc collects everything x402 Inc. contributes; /by/x402scan etc.
// mirror the per-directory view under a stable, source-oriented URL.
export function generateStaticParams() {
  return DIRECTORY_SOURCES.map((name) => ({ name }));
}

export default async function BySourcePage({
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
      title={`By ${meta.label}`}
      subtitle={`${endpoints.length} endpoint(s) · ${meta.home}`}
      endpoints={endpoints}
    />
  );
}
