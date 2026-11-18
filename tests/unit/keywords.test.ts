import { expect, it } from "vitest";
import { coverage, kbText, kwMatch, matchedKeywords, suggestSelection } from "@/lib/match/keywords";
import { kbSchema, type KnowledgeBase } from "@/lib/schemas/kb";
import seed from "../fixtures/kb.json";

// SPEC §14.4 Choose entries, §10.1 keyword matching: on the device, no LLM call.
const kb: KnowledgeBase = kbSchema.parse(seed);
const MINTLEAF = ["React", "TypeScript", "Node.js", "PostgreSQL", "SQL", "AWS", "Performance", "Testing", "Mentoring", "GraphQL", "Terraform", "Accessibility"];

it("matches keywords ignoring case, hyphens and a trailing s", () => {
  expect(kwMatch("Built event driven services", "Event-driven")).toBe(true);
  expect(kwMatch("Led the design system rollout", "Design systems")).toBe(true);
  expect(kwMatch("REACT and typescript", "react")).toBe(true);
  expect(kwMatch("Python ETL jobs", "Kubernetes")).toBe(false);
  expect(kwMatch("Engineering Excellence Award", "AWS")).toBe(false);
  expect(kwMatch("Google Cloud", "Go")).toBe(false);
  expect(kwMatch("Node.js and C++", "Node.js")).toBe(true);
  expect(kwMatch("PostgreSQL", "SQL")).toBe(false); // whole words only (SPEC §10.1)
  expect(matchedKeywords("React, Node.js and SQL", ["React", "Node.js", "Go lang", "SQL"])).toEqual(["React", "Node.js", "SQL"]);
});

it("never counts reference-only text as backing", () => {
  const withOriginal = { ...kb, additional: [{ id: "ad-1", title: "Original resume text (reference)", notes: "Kubernetes everywhere", referenceOnly: true }] };
  expect(kwMatch(kbText(withOriginal), "Kubernetes")).toBe(false);
  expect(kwMatch(kbText(kb), "Mentoring")).toBe(true);
});

it("pre-ticks entries like the mock: roles, education, referees, certifications, and matching portfolio items", () => {
  const ids = suggestSelection(kb, MINTLEAF);
  expect(ids).toEqual(["role-brightwater", "role-mosaic", "role-civic", "pf-tidewatch", "ed-unsw", "cr-aws", "ref-dana", "ref-sam"]);
  expect(ids).not.toContain("pf-ledgerline"); // a Go CLI matches none of Mintleaf's keywords
});

it("counts the job keywords backed by the ticked entries plus the skills list", () => {
  expect(coverage(kb, MINTLEAF, suggestSelection(kb, MINTLEAF))).toEqual({ covered: 12, total: 12 });
  const civicOnly = coverage({ ...kb, skills: [] }, MINTLEAF, ["role-civic"]);
  expect(civicOnly).toEqual({ covered: 2, total: 12 }); // SQL and Accessibility
});
