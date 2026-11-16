import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/*
 * Enforces "shared tokens only" (AGENTS.md, SPEC §11–12): no raw colours anywhere, and no one-off
 * durations or easings outside shadcn's own components (components/ui keeps its built-in motion).
 */
const ROOT = join(__dirname, "../..");
const TOKEN_FILE = "app/globals.css";

export function findViolations(path: string, text: string): string[] {
  const out: string[] = [];
  const rules: [RegExp, string][] = [[/#[0-9a-fA-F]{3,8}\b/g, "raw colour"]];
  if (!path.startsWith("components/ui/")) {
    rules.push([/\b\d+(\.\d+)?m?s\b(?![-\w])/g, "raw duration"], [/\bduration-\d/g, "duration-<number>"], [/\bease-\[/g, "arbitrary easing"]);
  }
  for (const [re, what] of rules) for (const m of text.matchAll(re)) out.push(`${path}: ${what} "${m[0]}"`);
  return out;
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(tsx?|css)$/.test(name) ? [relative(ROOT, full)] : [];
  });
}

describe("token guard", () => {
  it("catches raw colours, durations and easings", () => {
    expect(findViolations("components/shell/X.tsx", 'className="bg-[#fff] duration-300 ease-[cubic-bezier(1,0,0,1)]" delay: 200ms')).toHaveLength(4);
    expect(findViolations("components/ui/button.tsx", "duration-100 #abc")).toEqual(['components/ui/button.tsx: raw colour "#abc"']);
    expect(findViolations("components/shell/X.tsx", "duration-(--t) ease-spring h-36 size-[30px]")).toEqual([]);
  });

  it("finds no violations in app/ and components/", () => {
    const files = [...sourceFiles(join(ROOT, "app")), ...sourceFiles(join(ROOT, "components"))].filter((f) => f !== TOKEN_FILE);
    expect(files.length).toBeGreaterThan(5);
    expect(files.flatMap((f) => findViolations(f, readFileSync(join(ROOT, f), "utf8")))).toEqual([]);
  });
});
