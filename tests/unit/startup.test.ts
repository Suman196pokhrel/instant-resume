import { describe, expect, it } from "vitest";
import { checkStartup } from "../../lib/access/startup";

describe("checkStartup (SPEC §4.1)", () => {
  it.each([undefined, "", "127.0.0.1", "127.1.2.3", "::1", "[::1]", "localhost", "LOCALHOST"])(
    "allows loopback host %s without a password",
    (HOST) => {
      expect(checkStartup({ HOST })).toBeNull();
    },
  );

  it.each(["0.0.0.0", "192.168.1.5", "::", "my-server", "127.0.0.1.evil.example"])(
    "refuses non-loopback host %s without a password",
    (HOST) => {
      const err = checkStartup({ HOST });
      expect(err).toMatch(/HOST/);
      expect(err).toMatch(/APP_PASSWORD/);
    },
  );

  it("refuses a password under 12 characters, even on loopback", () => {
    expect(checkStartup({ HOST: "127.0.0.1", APP_PASSWORD: "elevenchars" })).toMatch(/APP_PASSWORD.*12/);
  });

  it("treats an empty APP_PASSWORD as unset", () => {
    expect(checkStartup({ HOST: "127.0.0.1", APP_PASSWORD: "" })).toBeNull();
    expect(checkStartup({ HOST: "0.0.0.0", APP_PASSWORD: "" })).toMatch(/not set/);
  });

  it("allows a non-loopback host with a 12-character password", () => {
    expect(checkStartup({ HOST: "0.0.0.0", APP_PASSWORD: "twelve-chars" })).toBeNull();
  });
});
