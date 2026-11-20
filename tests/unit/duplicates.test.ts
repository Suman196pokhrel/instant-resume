import { expect, it } from "vitest";
import { duplicates } from "@/lib/import/duplicates";

// TASK-54: importing a second version of the same resume flags the entries the KB already has (synthetic data).
const kb = {
  roles: [
    { id: "role-1", title: "Technical Lead", company: "Capstone with Acme (MapCo)", start: "Feb 2026", end: "Jun 2026", highlights: [] },
    { id: "role-2", title: "Frontend Developer", company: "Northwind Corp", start: "Sep 2024", end: "Dec 2024", highlights: [] },
  ],
  portfolio: [{ id: "pf-1", name: "Life grid PWA", summary: "", highlights: [] }],
  education: [{ id: "ed-1", degree: "Bachelor of Technology, Computer Science", institution: "Sharda University" }],
};

it("flags a re-imported role, project and degree even when the wording differs", () => {
  const draft = {
    roles: [
      { title: "Technical Lead and Full-Stack Developer", company: "Capstone, Acme (MapCo), Adelaide Feb 2026 - Jun 2026" },
      { title: "Support Engineer", company: "Brightwater Logistics" },
      { title: "Frontend Developer", company: "Northwind" },
    ],
    portfolio: [{ name: "Life Grid PWA" }, { name: "Video platform" }],
    education: [{ degree: "B.Tech, Computer Science and Engineering", institution: "Sharda University, India" }],
  };
  expect(duplicates(draft, kb)).toEqual([
    { key: "roles", index: 0 },
    { key: "roles", index: 2 },
    { key: "portfolio", index: 0 },
    { key: "education", index: 0 },
  ]);
});

it("needs both the employer and the title to overlap, and never matches empty fields", () => {
  const draft = { roles: [{ title: "Technical Lead", company: "Other Co" }, { title: "Analyst", company: "Acme MapCo" }, { title: "", company: "" }] };
  expect(duplicates(draft, kb)).toEqual([]);
  expect(duplicates(draft, null)).toEqual([]);
});
