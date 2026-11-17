import { credentialSchema, WORK_RIGHTS } from "./kb";

// Form fields for each knowledge base section (SPEC §13.2, mock views-app.js KB_SCHEMA), shared by the KB screen
// and the onboarding wizard. Required flags follow the Zod schemas (SPEC §6.1); tests/unit/kb-fields.test.ts checks.
export type FieldDef = {
  k: string;
  label: string;
  req?: boolean;
  ph?: string;
  type?: "email" | "select" | "textarea";
  options?: readonly string[];
  wide?: boolean;
  /** Comma-separated in the form, an array in the KB. */
  list?: boolean;
};
export type SectionDef = { label: string; noun: string; single?: boolean; highlights?: boolean; fields: FieldDef[] };

export const KB_ORDER = ["contact", "workRights", "roles", "volunteering", "portfolio", "education", "skills", "credentials", "referees", "additional"] as const;
export type KbSection = (typeof KB_ORDER)[number];
export const isKbSection = (s: string): s is KbSection => (KB_ORDER as readonly string[]).includes(s);

const roleFields = (company: string, dates: boolean): FieldDef[] => [
  { k: "title", label: "Job title", req: true, ph: "Senior Software Engineer" },
  { k: "company", label: company, req: true, ph: "Company name" },
  { k: "location", label: "Location", ph: "Sydney NSW" },
  { k: "start", label: "Start", req: dates, ph: "Mar 2022" },
  { k: "end", label: "End", req: dates, ph: "Present" },
];

export const KB_SECTIONS: Record<KbSection, SectionDef> = {
  contact: {
    label: "Contact",
    noun: "contact",
    single: true,
    fields: [
      { k: "name", label: "Full name", req: true, ph: "Jordan Whitlock" },
      { k: "email", label: "Email", req: true, type: "email", ph: "you@example.com" },
      { k: "phone", label: "Phone", ph: "04xx xxx xxx" },
      { k: "location", label: "Location", req: true, ph: "Sydney NSW" },
      { k: "linkedin", label: "LinkedIn", ph: "linkedin.com/in/…" },
      { k: "github", label: "GitHub or website", ph: "github.com/…" },
    ],
  },
  workRights: {
    label: "Work rights",
    noun: "work rights",
    single: true,
    fields: [
      { k: "status", label: "Work rights", req: true, type: "select", options: WORK_RIGHTS },
      { k: "noticePeriod", label: "Notice period", ph: "4 weeks" },
      { k: "notes", label: "Notes", ph: "Security clearance, visa expiry, etc.", wide: true },
    ],
  },
  roles: { label: "Experience", noun: "role", highlights: true, fields: roleFields("Employer", true) },
  volunteering: { label: "Volunteer work", noun: "volunteer role", highlights: true, fields: roleFields("Organisation", false) },
  portfolio: {
    label: "Portfolio",
    noun: "portfolio item",
    highlights: true,
    fields: [
      { k: "name", label: "Name", req: true, ph: "Tidewatch" },
      { k: "summary", label: "One-line summary", req: true, ph: "What it is and who uses it", wide: true },
      { k: "link", label: "Link", ph: "github.com/…" },
    ],
  },
  education: {
    label: "Education",
    noun: "qualification",
    fields: [
      { k: "degree", label: "Qualification", req: true, ph: "Bachelor of Science (Computer Science)", wide: true },
      { k: "institution", label: "Institution", req: true, ph: "UNSW Sydney" },
      { k: "year", label: "Year completed", ph: "2017" },
      { k: "notes", label: "Notes", ph: "Honours, WAM, thesis", wide: true },
    ],
  },
  skills: {
    label: "Skills",
    noun: "skill group",
    fields: [
      { k: "group", label: "Group name", req: true, ph: "Frontend" },
      { k: "items", label: "Skills, separated by commas", req: true, ph: "React, TypeScript, Playwright", wide: true, list: true },
    ],
  },
  credentials: {
    label: "Certifications and awards",
    noun: "credential",
    fields: [
      { k: "kind", label: "Type", req: true, type: "select", options: credentialSchema.shape.kind.options },
      { k: "title", label: "Title", req: true, ph: "AWS Certified Developer, Associate", wide: true },
      { k: "issuer", label: "Issuer", ph: "Amazon Web Services" },
      { k: "year", label: "Year", ph: "2023" },
    ],
  },
  referees: {
    label: "Referees",
    noun: "referee",
    fields: [
      { k: "name", label: "Name", req: true, ph: "Dana Okafor" },
      { k: "title", label: "Their job title", ph: "Engineering Manager" },
      { k: "company", label: "Company", ph: "Brightwater Logistics" },
      { k: "contact", label: "Email or phone", req: true, ph: "dana@example.com" },
    ],
  },
  additional: {
    label: "Additional sections",
    noun: "section",
    fields: [
      { k: "title", label: "Section title", req: true },
      { k: "notes", label: "Details", req: true, wide: true, type: "textarea" },
    ],
  },
};

/** Highlights editor copy (mock highlightsEditorHtml); kept here because the token guard reads "900ms" as a duration. */
export const HIGHLIGHT_COPY = {
  help: "Each highlight becomes a possible resume bullet. Include numbers where you have them.",
  text: "What you did and the result, e.g. Cut API latency from 900ms to 220ms with Redis caching",
  metric: "Metric, e.g. 900ms to 220ms",
};

export type FormValues = Record<string, string | undefined>;

/** Field errors keyed by field, empty when valid (mock validateFields copy). */
export function validateFields(section: KbSection, values: FormValues): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const f of KB_SECTIONS[section].fields) {
    const v = values[f.k]?.trim() ?? "";
    const empty = f.list ? !v.split(",").some((x) => x.trim()) : !v;
    if (f.req && empty) errors[f.k] = `Enter your ${f.label.toLowerCase().replace(/, separated by commas/, "")}`;
    else if (f.type === "email" && v && !/^\S+@\S+\.\S+$/.test(v)) errors[f.k] = "Enter an email like name@example.com";
  }
  return errors;
}

/** Form values to entry fields: trimmed text, list fields split on commas. Cleared fields stay "" so a PATCH clears them. */
export function toEntry(section: KbSection, values: FormValues): Record<string, string | string[]> {
  return Object.fromEntries(
    KB_SECTIONS[section].fields.map((f) => {
      const v = values[f.k]?.trim() ?? "";
      return [f.k, f.list ? v.split(",").map((x) => x.trim()).filter(Boolean) : v];
    })
  );
}

/** Entry fields to form values (the inverse of toEntry). */
export function toValues(section: KbSection, entry: Record<string, unknown> | undefined): FormValues {
  return Object.fromEntries(KB_SECTIONS[section].fields.map((f) => [f.k, Array.isArray(entry?.[f.k]) ? (entry[f.k] as string[]).join(", ") : ((entry?.[f.k] as string) ?? "")]));
}

export type EntrySummary = { title: string; sub?: string; meta?: string; line?: string; chips?: string[] };
const join = (sep: string, ...parts: unknown[]) => parts.filter(Boolean).join(sep);

/** What an entry card shows (mock kbEntrySummary), without stray separators for missing optional fields. */
export function entrySummary(section: KbSection, e: Record<string, unknown>): EntrySummary {
  const s = (k: string) => (e[k] as string | undefined) ?? "";
  switch (section) {
    case "roles":
    case "volunteering":
      return { title: s("title"), sub: join(", ", s("company"), s("location")), meta: join(" to ", s("start"), s("end")) };
    case "portfolio":
      return { title: s("name"), sub: s("summary"), meta: s("link") };
    case "education":
      return { title: s("degree"), sub: s("institution"), meta: s("year"), line: s("notes") };
    case "skills":
      return { title: s("group"), chips: e.items as string[] };
    case "credentials":
      return { title: s("title"), sub: join(", ", s("kind"), s("issuer")), meta: s("year") };
    case "referees":
      return { title: s("name"), sub: join(", ", s("title"), s("company")), meta: s("contact") };
    case "additional":
      return { title: s("title"), line: s("notes") };
    default:
      return { title: KB_SECTIONS[section].label };
  }
}
