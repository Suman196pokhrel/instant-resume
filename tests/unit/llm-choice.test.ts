import { expect, it } from "vitest";
import { defaultModel, modelsFor, resolveChoice } from "@/lib/llm/use-choice";
import type { Connection } from "@/lib/keystore";

// SPEC §8.1, §8.2 Active model: retired or unknown model IDs fall back instead of failing at call time.
const conn = (c: Partial<Connection>): Connection => ({ provider: "anthropic", masked: "sk-ant-…a9F2", model: "claude-sonnet-5-5", addedAt: 1, ...c });

it("offers the models the key can use, or every listed model for a connection saved before that was known", () => {
  expect(modelsFor(conn({ available: ["claude-opus-5-5"] }))).toEqual(["claude-opus-5-5"]);
  expect(modelsFor(conn({}))).toEqual(["claude-sonnet-5-5", "claude-opus-5-5", "claude-haiku-5-5"]);
});

it("falls back to the provider's first usable model when the saved one is retired", () => {
  expect(defaultModel(conn({ model: "claude-opus-5-5" }))).toBe("claude-opus-5-5");
  expect(defaultModel(conn({ provider: "openai", model: "gpt-5.2" }))).toBe("gpt-6.2-sol");
  expect(defaultModel(conn({ model: "claude-sonnet-5-5", available: ["claude-haiku-5-5"] }))).toBe("claude-haiku-5-5");
  expect(defaultModel(conn({ available: [] }))).toBeNull();
});

it("resolves the active model against what is connected", () => {
  const conns = [conn({ available: ["claude-sonnet-5-5", "claude-opus-5-5"] })];
  expect(resolveChoice({ provider: "anthropic", model: "claude-opus-5-5" }, conns)).toEqual({ provider: "anthropic", model: "claude-opus-5-5" });
  expect(resolveChoice({ provider: "anthropic", model: "claude-haiku-5-5" }, conns)).toEqual({ provider: "anthropic", model: "claude-sonnet-5-5" });
  expect(resolveChoice({ provider: "openai", model: "gpt-6.2-sol" }, conns)).toBeNull();
  expect(resolveChoice(null, conns)).toBeNull();
});
