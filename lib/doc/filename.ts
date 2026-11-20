// Export file names (SPEC §9.3; mock docs.js fileName): {First}-{Last}-Resume-{Company}.pdf, the company sanitised to
// [A-Za-z0-9-] so every file system and job site takes it.
const clean = (s: string) => s.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const MAX = 40;

/** The company for a file name: as written when short; else its bracketed short form ("… (TAHS SA/NT)"), else cut at a word. */
function companyPart(company: string) {
  const full = clean(employer(company));
  if (full.length <= MAX) return full;
  const short = clean(company.match(/\(([^)]+)\)\s*$/)?.[1] ?? "");
  if (short && short.length <= 20) return short;
  return full.slice(0, MAX + 1).replace(/-[^-]*$/, "").replace(/(-(and|for|of|the|in|at))+$/i, "");
}

export function fileName(name: string, kind: "resume" | "coverLetter", company: string): string {
  const who = name.trim().split(/\s+/).join("-");
  const co = companyPart(company);
  return `${who}-${kind === "resume" ? "Resume" : "Cover-Letter"}${co ? `-${co}` : ""}.pdf`;
}

/** The employer's name, or "" when the ad names none (the brief then holds "Not stated"). */
export const employer = (company: string) => (/^(not stated|not specified|unknown|n\/?a|none)?$/i.test(company.trim()) ? "" : company);
/** "Retail Assistant at Harbour Health", or just the role when the ad names no employer. */
export const roleAt = (role: string, company: string) => (employer(company) ? `${role} at ${company}` : role);
