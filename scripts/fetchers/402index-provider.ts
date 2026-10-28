import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { Endpoint } from "../../src/lib/types";

// Provider-submitted endpoint currently listed in 402 Index. This small seed
// is kept separate from x402 Inc's self-curated entries and links to the
// originating public listing for provenance.
const __dirname = dirname(fileURLToPath(import.meta.url));
const SEED = join(__dirname, "..", "..", "data", "seed", "402index-provider.json");

export async function fetch402IndexProvider(): Promise<Endpoint[]> {
  const entries = JSON.parse(await readFile(SEED, "utf8")) as Endpoint[];
  return entries.map((entry) => ({
    ...entry,
    source: entry.source.includes("402index") ? entry.source : ["402index"],
  }));
}
