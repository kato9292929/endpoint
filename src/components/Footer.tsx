import { getCatalog } from "@/lib/data";

export function Footer() {
  const { generated_at } = getCatalog();
  const date = new Date(generated_at);
  const human = isNaN(date.getTime())
    ? generated_at
    : date.toISOString().slice(0, 10);

  return (
    <footer className="border-t border-border mt-12">
      <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-muted space-y-2">
        <p>
          Data reflects each directory as of its fetch time. Last catalog
          update: <span className="text-white">{human}</span>.
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            Accuracy and availability of each endpoint depend on the
            originating directory.
          </li>
          <li>
            Use of any endpoint is subject to that endpoint&apos;s own terms of
            service.
          </li>
          <li>This site is informational and is not investment advice.</li>
        </ul>
        <p>
          x402 Endpoint is a community catalog. Add or correct endpoints via{" "}
          <a
            className="text-accent hover:underline"
            href="https://github.com/kato9292929/endpoint"
          >
            GitHub PR
          </a>
          .
        </p>
      </div>
    </footer>
  );
}
