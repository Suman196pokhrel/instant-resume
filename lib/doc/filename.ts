// Export file names (SPEC §9.3; mock docs.js fileName): {First}-{Last}-Resume-{Company}.pdf, the company sanitised to
// [A-Za-z0-9-] so every file system and job site takes it.
export function fileName(name: string, kind: "resume" | "coverLetter", company: string): string {
  const who = name.trim().split(/\s+/).join("-");
  const co = employer(company).replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `${who}-${kind === "resume" ? "Resume" : "Cover-Letter"}${co ? `-${co}` : ""}.pdf`;
}

/** The employer's name, or "" when the ad names none (the brief then holds "Not stated"). */
export const employer = (company: string) => (/^(not stated|not specified|unknown|n\/?a|none)?$/i.test(company.trim()) ? "" : company);
/** "Retail Assistant at Harbour Health", or just the role when the ad names no employer. */
export const roleAt = (role: string, company: string) => (employer(company) ? `${role} at ${company}` : role);
