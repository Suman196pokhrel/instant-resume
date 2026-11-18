// Export file names (SPEC §9.3; mock docs.js fileName): {First}-{Last}-Resume-{Company}.pdf, the company sanitised to
// [A-Za-z0-9-] so every file system and job site takes it.
export function fileName(name: string, kind: "resume" | "coverLetter", company: string): string {
  const who = name.trim().split(/\s+/).join("-");
  const co = company.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `${who}-${kind === "resume" ? "Resume" : "Cover-Letter"}-${co}.pdf`;
}
