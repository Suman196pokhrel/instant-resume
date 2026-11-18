import { afterEach, expect, it, vi } from "vitest";
import { z } from "zod";

// SPEC §8.1: getAdapter() is the one switch every screen uses: the mock in test builds, else the active model.
vi.mock("@/lib/keystore", () => ({ getActiveModel: () => null, listConnections: async () => [], readKey: async () => null }));
const { getAdapter } = await import("@/lib/llm/adapter");

afterEach(() => vi.unstubAllEnvs());

it("returns the mock when NEXT_PUBLIC_LLM_MOCK=1", async () => {
  vi.stubEnv("NEXT_PUBLIC_LLM_MOCK", "1");
  const schema = z.object({ ok: z.boolean(), scenario: z.string() });
  expect((await (await getAdapter()).generateObject({ name: "ping", schema, system: "", prompt: "" })).object).toEqual({ ok: true, scenario: "happy" });
});

it("explains that no model is connected instead of failing on a call", async () => {
  vi.stubEnv("NEXT_PUBLIC_LLM_MOCK", "");
  await expect(getAdapter()).rejects.toMatchObject({ kind: "setup", title: "No model connected", action: { href: "/settings" } });
});
