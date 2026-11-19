import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, expect, it } from "vitest";
import fixture from "../fixtures/kb.json";
import * as kb from "@/app/api/kb/route";
import { getDb } from "@/lib/db/client";
import { readKb, writeKb } from "@/lib/db/kb";
import { ONBOARDING_START, readOnboarding, writeOnboarding } from "@/lib/db/onboarding";
import { createProject, listProjects } from "@/lib/db/projects";
import { THEME_DEFAULTS } from "@/lib/schemas/theme";

// Owner's bug: a quick way to wipe the knowledge base. DELETE /api/kb clears it and the onboarding draft; applications stay.
beforeAll(async () => {
  process.chdir(mkdtempSync(join(tmpdir(), "ir-kb-wipe-")));
  const db = await getDb();
  await writeKb(db, structuredClone(fixture));
  await writeOnboarding(db, { ...ONBOARDING_START, step: 3, maxStep: 3, draft: { contact: { name: "Draft Person" } } });
  const brief = { title: "Engineer", company: "Mintleaf", location: "Adelaide SA", seniority: "Mid-level", requirements: ["Go"], niceToHave: [], keywords: ["Go"], workRights: "Not stated" };
  await createProject(db, { project: { company: "Mintleaf", role: "Engineer", location: "Adelaide SA", jdText: "An ad", brief, selected: [], source: "studio" }, documents: [{ kind: "resume", theme: THEME_DEFAULTS, sections: [] }] });
});

it("deletes every knowledge base entry and the onboarding draft, and keeps the applications", async () => {
  const res = await kb.DELETE();
  expect(res.status).toBe(204);
  const db = await getDb();
  expect(await readKb(db)).toBeNull();
  expect(await readOnboarding(db)).toEqual(ONBOARDING_START);
  expect(await listProjects(db)).toHaveLength(1);
});
