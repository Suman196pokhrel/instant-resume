/* eslint-disable @typescript-eslint/no-explicit-any -- these tests break the fixture on purpose */
import { describe, expect, it } from "vitest";
import fixture from "../fixtures/kb.json";
import { kbSchema } from "../../lib/schemas/kb";
import { documentSchema, sectionSchema } from "../../lib/schemas/document";
import { THEME_DEFAULTS, THEME_PRESETS, themeSchema } from "../../lib/schemas/theme";
import { prefsSchema } from "../../lib/schemas/settings";
import { CURRENT_VERSION, upgrade } from "../../lib/schemas/migrate";

// SPEC §6, §18.1 Schemas.
const kb = () => structuredClone(fixture) as Record<string, any>;

describe("knowledge base (AC2, AC4)", () => {
  it("the seed KB parses, at schemaVersion 1, with empty volunteering and additional", () => {
    const parsed = kbSchema.parse(fixture);
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.contact.name).toBe("Jordan Whitlock");
    expect(parsed.volunteering).toEqual([]);
    expect(parsed.additional).toEqual([]);
  });

  it("rejects any other schemaVersion", () => {
    expect(kbSchema.safeParse({ ...kb(), schemaVersion: 2 }).success).toBe(false);
  });
});

describe("required fields (AC3)", () => {
  it.each([
    ["contact.name", (k: any) => delete k.contact.name],
    ["contact.name blank", (k: any) => (k.contact.name = "  ")],
    ["role.title", (k: any) => delete k.roles[0].title],
    ["highlight.text", (k: any) => delete k.roles[0].highlights[0].text],
    ["workRights.status", (k: any) => (k.workRights.status = "Whatever")],
    ["referee.contact", (k: any) => delete k.referees[0].contact],
  ])("missing %s fails", (_, mutate) => {
    const k = kb();
    mutate(k);
    expect(kbSchema.safeParse(k).success).toBe(false);
  });

  it("optional fields may be empty", () => {
    const k = kb();
    k.roles[0].highlights[0].metric = "";
    delete k.contact.phone;
    expect(kbSchema.safeParse(k).success).toBe(true);
  });
});

const experience = (bullet: Record<string, unknown>) => ({
  id: "sec-exp",
  kind: "experience",
  title: "Experience",
  hidden: false,
  items: [{ id: "it-1", ref: "role-brightwater", heading: "Senior Software Engineer", bullets: [{ id: "b-1", text: "Did a thing", ...bullet }] }],
});

describe("documents (AC3)", () => {
  it("a bullet needs its source highlight", () => {
    expect(sectionSchema.safeParse(experience({ source: "hl-bw-1" })).success).toBe(true);
    expect(sectionSchema.safeParse(experience({})).success).toBe(false);
    expect(sectionSchema.safeParse(experience({ source: "" })).success).toBe(false);
  });

  it("text kinds need text and item kinds need items", () => {
    expect(sectionSchema.safeParse({ id: "s", kind: "summary", title: "Summary", hidden: false, text: "Hi" }).success).toBe(true);
    expect(sectionSchema.safeParse({ id: "s", kind: "summary", title: "Summary", hidden: false }).success).toBe(false);
    expect(sectionSchema.safeParse({ id: "s", kind: "skills", title: "Skills", hidden: false }).success).toBe(false);
  });

  it("a whole document parses", () => {
    const doc = { id: "doc-1", projectId: "p-1", kind: "resume", theme: THEME_DEFAULTS, sections: [experience({ source: "hl-bw-1" })] };
    expect(documentSchema.safeParse(doc).success).toBe(true);
  });
});

describe("theme (AC3)", () => {
  it("defaults and every preset parse", () => {
    expect(themeSchema.parse(THEME_DEFAULTS)).toEqual(THEME_DEFAULTS);
    for (const preset of Object.values(THEME_PRESETS)) expect(themeSchema.safeParse(preset).success).toBe(true);
    expect(Object.keys(THEME_PRESETS)).toEqual(["classic", "modern", "compact"]);
  });

  it.each([
    ["baseSize", 8.5],
    ["baseSize", 12.5],
    ["headingSize", 15.5],
    ["nameSize", 15],
    ["margin", 26],
    ["lineHeight", 1.75],
    ["sectionGap", 3],
    ["font", "Comic Sans"],
    ["accent", "teal"],
    ["accent", "#0E766"],
  ])("%s = %s fails", (field, value) => {
    expect(themeSchema.safeParse({ ...THEME_DEFAULTS, [field]: value }).success).toBe(false);
  });
});

describe("settings", () => {
  it("prefs default to A4, AU spelling and the classic two-page quick setup", () => {
    expect(prefsSchema.parse({})).toEqual({
      paper: "A4",
      spelling: "en-AU",
      quick: { theme: "classic", pages: 2, coverLetter: true, tone: "Professional" },
      dismissedOnboardingBanner: false,
    });
  });
});

describe("schemaVersion migration hook (AC4)", () => {
  it("leaves current records alone, runs older steps and refuses newer records", () => {
    expect(CURRENT_VERSION).toBe(1);
    const v1 = { schemaVersion: 1, a: 1 };
    expect(upgrade(v1)).toBe(v1);
    expect(upgrade({ schemaVersion: 0, old: "x" }, { 0: (r) => ({ ...r, schemaVersion: 1, renamed: r.old }) })).toEqual({
      schemaVersion: 1,
      old: "x",
      renamed: "x",
    });
    expect(() => upgrade({ schemaVersion: 0 }, {})).toThrow(/version 0/);
    expect(() => upgrade({ schemaVersion: 7 })).toThrow(/newer version/);
  });
});

describe("unique ids (TASK-4)", () => {
  it("rejects a reused entry or highlight id, naming it", () => {
    const k = kb();
    k.portfolio[0].highlights[0].id = "hl-bw-1";
    const r = kbSchema.safeParse(k);
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toMatch(/hl-bw-1/);
    const k2 = kb();
    k2.education[0].id = "role-civic";
    expect(kbSchema.safeParse(k2).success).toBe(false);
  });
});
