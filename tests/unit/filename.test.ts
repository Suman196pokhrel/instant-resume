import { expect, it } from "vitest";
import { fileName, roleAt } from "@/lib/doc/filename";

// SPEC §9.3: {First}-{Last}-Resume-{Company}.pdf, the company sanitised to [A-Za-z0-9-].
it("hyphen-joins the name and sanitises the company", () => {
  expect(fileName("Jordan Whitlock", "resume", "Southerly Energy (AU) Pty.")).toBe("Jordan-Whitlock-Resume-Southerly-Energy-AU-Pty.pdf");
  expect(fileName("  Jordan   Whitlock ", "coverLetter", "Mintleaf")).toBe("Jordan-Whitlock-Cover-Letter-Mintleaf.pdf");
  expect(fileName("Jordan Whitlock", "resume", "A&B_Co / Ltd")).toBe("Jordan-Whitlock-Resume-A-B-Co-Ltd.pdf");
});

it("an ad that names no employer leaves the company out instead of saying \"Not stated\"", () => {
  expect(fileName("Jordan Whitlock", "resume", "Not stated")).toBe("Jordan-Whitlock-Resume.pdf");
  expect(roleAt("Retail Sales Assistant", "Not stated")).toBe("Retail Sales Assistant");
  expect(roleAt("Retail Sales Assistant", "Harbour Health")).toBe("Retail Sales Assistant at Harbour Health");
});

it("a long company name uses its bracketed short form, or is cut at a word to 40 characters (TASK-58)", () => {
  expect(fileName("Jordan Whitlock", "resume", "Tessellate Allied Health Services South Australia and Northern Territory (TAHS SA/NT)")).toBe("Jordan-Whitlock-Resume-TAHS-SA-NT.pdf");
  expect(fileName("Jordan Whitlock", "coverLetter", "Department for Infrastructure and Transport South Australia")).toBe("Jordan-Whitlock-Cover-Letter-Department-for-Infrastructure.pdf");
  expect(fileName("Jordan Whitlock", "resume", "Southerly Energy (AU) Pty.")).toBe("Jordan-Whitlock-Resume-Southerly-Energy-AU-Pty.pdf"); // short: unchanged
});
