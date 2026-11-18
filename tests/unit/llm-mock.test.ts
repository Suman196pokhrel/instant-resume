import { expect, it } from "vitest";
import { z } from "zod";
import { createMockAdapter, MOCK_FIXTURES, mockScenario } from "@/lib/llm/mock";

// SPEC §8.1 mock provider, §17 scenarios: deterministic, offline, and validated like a real answer.
const ping = { name: "ping", schema: z.object({ ok: z.boolean(), scenario: z.string() }), system: "", prompt: "" };

it("returns the same fixture every time, with the scenario it was given", async () => {
  const mock = createMockAdapter({ fixtures: MOCK_FIXTURES, scenario: "gaps" });
  const a = await mock.generateObject(ping);
  expect(a).toEqual({ object: { ok: true, scenario: "gaps" }, usage: { inputTokens: 0, outputTokens: 0 } });
  expect(await mock.generateObject(ping)).toEqual(a);
});

it("checks fixtures against the call's schema, like a real answer", async () => {
  const mock = createMockAdapter({ fixtures: { ping: () => ({ ok: "yes" }) }, scenario: "happy" });
  await expect(mock.generateObject(ping)).rejects.toMatchObject({ name: "LlmError", kind: "output" });
});

it("fails clearly for a call with no fixture", async () => {
  await expect(createMockAdapter({ fixtures: {}, scenario: "happy" }).generateObject(ping)).rejects.toMatchObject({ kind: "other", detail: "no mock fixture for ping" });
});

it("waits for the delay, and a cancel stops the wait", async () => {
  const controller = new AbortController();
  const pending = createMockAdapter({ fixtures: MOCK_FIXTURES, scenario: "happy", delayMs: 10_000 }).generateObject({ ...ping, signal: controller.signal });
  controller.abort();
  await expect(pending).rejects.toMatchObject({ name: "AbortError" });
});

it("reads the scenario from ?mock=, defaulting to happy", () => {
  expect(mockScenario("?mock=findings")).toBe("findings");
  expect(mockScenario("?mock=error-stage-3")).toBe("error-stage-3");
  expect(mockScenario("?mock=nonsense")).toBe("happy");
  expect(mockScenario("")).toBe("happy");
});
