import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NextRequest } from "next/server";
import { beforeAll, describe, expect, it } from "vitest";
import { GET, PUT } from "@/app/api/settings/route";

// SPEC §6.5, §13.3 Preferences (TASK-38): prefs default to A4 and Australian, and a PUT is what the next load reads.
const put = (body: unknown) => PUT(new NextRequest("http://app.test/api/settings", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));
const get = async () => (await GET()).json();

beforeAll(() => process.chdir(mkdtempSync(join(tmpdir(), "ir-settings-"))));

describe("prefs", () => {
  it("default to A4 and Australian (AC2)", async () => {
    expect(await get()).toMatchObject({ paper: "A4", spelling: "en-AU", quick: { theme: "classic", pages: 1, coverLetter: true, tone: "Professional" } });
  });

  it("a saved choice is what the next load reads (AC2)", async () => {
    const prefs = { ...(await get()), paper: "Letter", spelling: "en-US" };
    expect((await put(prefs)).status).toBe(200);
    expect(await get()).toEqual(prefs);
  });

  it("rejects an unknown paper size and keeps what was saved", async () => {
    const before = await get();
    expect((await put({ ...before, paper: "A3" })).status).toBe(422);
    expect(await get()).toEqual(before);
  });
});
