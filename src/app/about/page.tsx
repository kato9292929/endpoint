import Link from "next/link";
import { DIRECTORY_META, DIRECTORY_SOURCES } from "@/lib/types";
import { getCatalog } from "@/lib/data";

export const revalidate = 86400;

export const metadata = {
  title: "About — x402 Endpoint",
};

export default function AboutPage() {
  const { generated_at, endpoints } = getCatalog();

  return (
    <div className="prose-invert max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">About</h1>
      </header>

      <section className="space-y-3 text-sm text-muted">
        <p className="text-white">
          x402 Endpoint is a cross-directory unified catalog of x402 ecosystem
          endpoints. The x402 ecosystem has several community-maintained
          directories running in parallel — this site brings them into one
          place so you don&apos;t have to check each one individually.
        </p>
        <p>
          Currently tracking{" "}
          <span className="text-white">{endpoints.length}</span> endpoints,
          last updated{" "}
          <span className="text-white">
            {new Date(generated_at).toISOString().slice(0, 10)}
          </span>
          .
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Data sources</h2>
        <ul className="space-y-1 text-sm">
          {DIRECTORY_SOURCES.map((s) => (
            <li key={s} className="flex items-center gap-2">
              <Link
                href={`/directory/${s}`}
                className="text-accent hover:underline"
              >
                {DIRECTORY_META[s].label}
              </Link>
              <a
                href={DIRECTORY_META[s].home}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted hover:text-white text-xs"
              >
                {DIRECTORY_META[s].home} ↗
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2 text-sm text-muted">
        <h2 className="text-lg font-medium text-white">Update frequency</h2>
        <p>
          A daily GitHub Actions job fetches each directory, rebuilds the
          unified <code>data/endpoints.json</code>, and commits it. Vercel
          redeploys on push and pages revalidate once per day (ISR).
        </p>
      </section>

      <section className="space-y-2 text-sm text-muted">
        <h2 className="text-lg font-medium text-white">Built by x402 Inc.</h2>
        <p>
          This catalog is built by{" "}
          <a className="text-accent hover:underline" href="https://x402jp.com">
            x402 Inc.
          </a>
          , which also ships its own x402 endpoints (onchain data,
          intelligence, oracle, and compliance APIs). Those endpoints are
          contributed to this catalog under the{" "}
          <Link className="text-accent hover:underline" href="/by/x402-inc">
            x402 Inc.
          </Link>{" "}
          source, alongside the community directories.
        </p>
        <p>
          They are treated exactly like every other source: aggregated the same
          way, with no ranking boost or special placement. If a third-party
          directory also lists one of these URLs, the entry simply shows both
          sources. See more at{" "}
          <a className="text-accent hover:underline" href="https://note.com/x402inc">
            note.com/x402inc
          </a>
          .
        </p>
      </section>

      <section className="space-y-2 text-sm text-muted">
        <h2 className="text-lg font-medium text-white">Contributing</h2>
        <p>
          There is no sign-up or submission form. To add or correct an
          endpoint, open a pull request against{" "}
          <a
            className="text-accent hover:underline"
            href="https://github.com/kato9292929/endpoint"
          >
            the repository
          </a>
          .
        </p>
      </section>

      <section className="space-y-2 text-sm text-muted">
        <h2 className="text-lg font-medium text-white">Disclaimer</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Data reflects each directory as of its fetch time.</li>
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
      </section>
    </div>
  );
}
