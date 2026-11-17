import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, expect, it } from "vitest";
import Page from "@/app/(shell)/kb/[section]/page";

// SPEC §13.2: before onboarding there is no knowledge base to show, so /kb/* sends the user to build one.
beforeAll(() => process.chdir(mkdtempSync(join(tmpdir(), "ir-kb-page-"))));

const render = (section: string) => Page({ params: Promise.resolve({ section }) } as PageProps<"/kb/[section]">);

it("redirects to /onboarding when there is no knowledge base", async () => {
  await expect(render("roles")).rejects.toMatchObject({ digest: expect.stringMatching(/^NEXT_REDIRECT;.*;\/onboarding;/) });
});

it("404s an unknown section before reading the database", async () => {
  await expect(render("nope")).rejects.toMatchObject({ digest: expect.stringMatching(/NEXT_HTTP_ERROR_FALLBACK;404/) });
});
