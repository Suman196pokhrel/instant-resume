import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, expect, it } from "vitest";
import fixture from "../fixtures/kb.json";
import Home from "@/app/page";
import { getDb } from "@/lib/db/client";
import { writeKb } from "@/lib/db/kb";

// SPEC §13: an empty knowledge base sends / to onboarding; otherwise the dashboard.
beforeAll(() => process.chdir(mkdtempSync(join(tmpdir(), "ir-root-"))));
const target = async () => {
  try {
    await Home();
  } catch (e) {
    return (e as { digest: string }).digest.split(";")[2];
  }
};

it("goes to /onboarding before there is a knowledge base, then to /dashboard", async () => {
  expect(await target()).toBe("/onboarding");
  await writeKb(await getDb(), fixture);
  expect(await target()).toBe("/dashboard");
});
