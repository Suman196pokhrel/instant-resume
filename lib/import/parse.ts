// Basic local resume parser for pasted text and TXT files (SPEC §14.1a, ported from mock views-import.js). It runs
// in the browser, so the text never leaves the device. It only copies what is there: missing facts (dates,
// location, work rights) stay absent for the user to fill in at Review, and nothing is dropped. Unknown sections
// become Additional sections, and the whole original text is kept as reference-only.

type Entry = Record<string, unknown>;
export type ParsedDraft = {
  contact: Entry;
  workRights?: Entry;
  roles: Entry[];
  volunteering: Entry[];
  portfolio: Entry[];
  education: Entry[];
  skills: Entry[];
  credentials: Entry[];
  referees: Entry[];
  additional: Entry[];
};
type Kind = "roles" | "volunteering" | "portfolio" | "education" | "skills" | "credentials" | "referees" | "additional";

// "Work rights" is deliberately absent: a work-rights entry needs a status, which is never inferred, so that
// section is kept as an Additional section instead (where its text can't be lost).
const HEADINGS: Record<string, Kind> = {
  experience: "roles",
  "work experience": "roles",
  "employment history": "roles",
  "professional experience": "roles",
  "volunteer work": "volunteering",
  volunteering: "volunteering",
  "volunteer experience": "volunteering",
  education: "education",
  qualifications: "education",
  skills: "skills",
  "technical skills": "skills",
  projects: "portfolio",
  portfolio: "portfolio",
  certifications: "credentials",
  awards: "credentials",
  publications: "credentials",
  references: "referees",
  referees: "referees",
};

/** Keeps only the fields that have a value. */
const present = (e: Entry): Entry => Object.fromEntries(Object.entries(e).filter(([, v]) => v !== "" && v !== undefined));

export function parseResume(text: string): ParsedDraft {
  const lines = text.replace(/\r/g, "").split("\n");
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
  const phone = text.match(/\+?\d[\d ()-]{7,}\d/)?.[0];
  const d: ParsedDraft = {
    contact: present({ id: "kb-contact", name: lines.find((l) => l.trim())?.trim(), email, phone }),
    roles: [],
    volunteering: [],
    portfolio: [],
    education: [],
    skills: [],
    credentials: [],
    referees: [],
    additional: [],
  };

  const sections: { title: string; kind: Kind; lines: string[] }[] = [];
  let current = { title: "Contact and introductory details", kind: "additional" as Kind, lines: [] as string[] };
  for (const line of lines) {
    const value = line.trim();
    const kind = HEADINGS[value.replace(/:$/, "").toLowerCase()] ?? (/^[A-Z][A-Z &/-]{2,45}:?$/.test(value) || /^[A-Za-z][A-Za-z &/-]{1,45}:$/.test(value) ? "additional" : null);
    if (kind) {
      if (current.lines.some((l) => l.trim())) sections.push(current);
      current = { title: value.replace(/:$/, ""), kind, lines: [] };
    } else current.lines.push(line);
  }
  if (current.lines.some((l) => l.trim())) sections.push(current);

  for (const [i, s] of sections.entries()) {
    const content = s.lines.join("\n").trim();
    if (s.kind === "additional") {
      d.additional.push({ title: s.title, notes: content, ...(i === 0 && s.title === "Contact and introductory details" && { referenceOnly: true }) });
      continue;
    }
    for (const block of content.split(/\n\s*\n/).filter((b) => b.trim())) {
      const rows = block.split("\n").map((l) => l.trim()).filter(Boolean);
      const parts = rows[0].split(/\s+\|\s+/);
      const highlights = rows.slice(1).map((t) => ({ text: t.replace(/^[•*-]\s*/, ""), skills: [] }));
      const entry: Record<Kind, () => Entry> = {
        roles: () => ({ title: parts[0], company: parts[1], highlights }),
        volunteering: () => ({ title: parts[0], company: parts[1], highlights }),
        education: () => ({ degree: parts[0], institution: parts[1], notes: rows.slice(1).join("\n") }),
        skills: () => ({ group: s.title, items: rows.join(", ").split(/[,;](?![^()]*\))/).map((x) => x.trim()).filter(Boolean) }),
        portfolio: () => ({ name: parts[0], summary: parts.slice(1).join(" | "), highlights }),
        credentials: () => ({ kind: /publication/i.test(s.title) ? "Publication" : /award/i.test(s.title) ? "Award" : "Certification", title: rows.join(" — ") }),
        referees: () => ({ name: parts[0], title: parts[1], contact: rows.slice(1).join("\n") }),
        additional: () => ({}),
      };
      d[s.kind].push(present(entry[s.kind]()));
    }
  }
  d.additional.push({ title: "Original resume text (reference)", notes: text, referenceOnly: true });
  return d;
}
