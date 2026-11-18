import { expect, it } from "vitest";
import { fileName } from "@/lib/doc/filename";

// SPEC §9.3: {First}-{Last}-Resume-{Company}.pdf, the company sanitised to [A-Za-z0-9-].
it("hyphen-joins the name and sanitises the company", () => {
  expect(fileName("Jordan Whitlock", "resume", "Southerly Energy (AU) Pty.")).toBe("Jordan-Whitlock-Resume-Southerly-Energy-AU-Pty.pdf");
  expect(fileName("  Jordan   Whitlock ", "coverLetter", "Mintleaf")).toBe("Jordan-Whitlock-Cover-Letter-Mintleaf.pdf");
  expect(fileName("Jordan Whitlock", "resume", "A&B_Co / Ltd")).toBe("Jordan-Whitlock-Resume-A-B-Co-Ltd.pdf");
});
