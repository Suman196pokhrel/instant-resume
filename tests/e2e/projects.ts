import { expect, test, type Page } from "@playwright/test";
import { THEME_DEFAULTS } from "../../lib/schemas/theme";

// A project made through the API, for specs that need one on the shared seeded server (the seed has none, and other
// files add projects in parallel, so roles are unique).
export const SUMMARY = "Engineer with eight years in web apps.";
export const unique = (name: string) => `${name} ${Math.random().toString(36).slice(2, 7)}`;

export async function makeProject(page: Page, { role = unique("Platform Engineer"), company = "Southerly Energy", requirements = ["Go"], keywords = ["Go"], jdText = "An ad" } = {}) {
  const brief = { title: role, company, location: "Sydney NSW", seniority: "Senior", requirements, niceToHave: [], keywords, workRights: "Not stated" };
  const resume = {
    kind: "resume",
    theme: THEME_DEFAULTS,
    sections: [
      { id: "s-sum", kind: "summary", title: "Summary", hidden: false, text: SUMMARY },
      { id: "s-exp", kind: "experience", title: "Experience", hidden: false, items: [{ id: "i-1", ref: "role-brightwater", heading: "Senior Software Engineer", sub: "Brightwater Logistics", meta: "Sydney NSW | Mar 2022 to Present", bullets: [{ id: "b-1", text: "Cut page load from 4.2s to 1.1s", source: "hl-bw-1" }] }] },
    ],
  };
  const letter = { kind: "coverLetter", theme: THEME_DEFAULTS, recipient: { name: "Hiring team", company, location: "Sydney NSW" }, sections: ["Opening", "Evidence", "Fit", "Close"].map((t, i) => ({ id: `p-${i}`, kind: "paragraph", title: t, hidden: false, text: `${t} paragraph.` })) };
  const res = await page.request.post("/api/projects", {
    headers: { origin: new URL(test.info().project.use.baseURL!).origin }, // state-changing requests must come from the app's origin
    data: { project: { company, role, location: "Sydney NSW", jdText, brief, selected: ["role-brightwater"], source: "studio" }, documents: [resume, letter] },
  });
  expect(res.status()).toBe(201);
  return { id: (await res.json()).project.id as string, role };
}
