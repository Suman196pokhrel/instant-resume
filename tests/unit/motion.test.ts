import { afterEach, describe, expect, it, vi } from "vitest";
import { devUiEnabled } from "../../lib/dev";
import { prefersReducedMotion } from "../../lib/motion";

describe("prefersReducedMotion", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("follows the prefers-reduced-motion media query", () => {
    vi.stubGlobal("matchMedia", (q: string) => ({ matches: q === "(prefers-reduced-motion: reduce)" }));
    expect(prefersReducedMotion()).toBe(true);
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    expect(prefersReducedMotion()).toBe(false);
  });

  it("is false on the server, where matchMedia doesn't exist", () => {
    vi.stubGlobal("matchMedia", undefined);
    expect(prefersReducedMotion()).toBe(false);
  });
});

describe("devUiEnabled", () => {
  it("is on in development and off in production unless IR_DEV_UI=1", () => {
    expect(devUiEnabled({ NODE_ENV: "development" })).toBe(true);
    expect(devUiEnabled({ NODE_ENV: "production" })).toBe(false);
    expect(devUiEnabled({ NODE_ENV: "production", IR_DEV_UI: "1" })).toBe(true);
    expect(devUiEnabled({ NODE_ENV: "production", IR_DEV_UI: "true" })).toBe(false);
  });
});
