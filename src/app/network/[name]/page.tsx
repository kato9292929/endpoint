import { notFound } from "next/navigation";
import { EndpointGrid } from "@/components/EndpointGrid";
import { getByNetwork, getNetworks } from "@/lib/data";

export const revalidate = 86400;

export function generateStaticParams() {
  return getNetworks().map((n) => ({ name: n.name.toLowerCase() }));
}

export default async function NetworkPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const endpoints = getByNetwork(name);
  if (endpoints.length === 0) notFound();

  // Use the canonical casing from the data for the title.
  const display = endpoints[0].networks.find(
    (n) => n.toLowerCase() === name.toLowerCase(),
  );

  return (
    <EndpointGrid
      title={`Network: ${display ?? name}`}
      subtitle={`${endpoints.length} endpoint(s)`}
      endpoints={endpoints}
    />
  );
}
