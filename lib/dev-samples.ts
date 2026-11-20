import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { devUiEnabled } from "./dev";

export type SampleJd = { label: string; text: string };

/**
 * Synthetic job ads for trying Quick generate and Studio (SPEC §14.3, §14.4; the mock's MOCK.jds), dev only like
 * /dev/ui, so they never reach a production page. Label: "Company, Title" from the ad's first two lines.
 */
export async function sampleJds(): Promise<SampleJd[] | null> {
  if (!devUiEnabled()) return null;
  const dir = join(process.cwd(), "tests/fixtures/jds");
  const names = (await readdir(dir).catch(() => [])).filter((n) => n.endsWith(".txt")).sort();
  return Promise.all(
    names.map(async (n) => {
      const text = (await readFile(join(dir, n), "utf8")).trim();
      const [title = "", place = ""] = text.split("\n");
      return { label: `${place.split(",")[0].trim()}, ${title.trim()}`, text };
    })
  );
}
