import type { JobBrief } from "@/lib/schemas/brief";
import type { ResumeDocument, Section } from "@/lib/schemas/document";
import type { KnowledgeBase } from "@/lib/schemas/kb";

// Plain text for job sites that ask you to paste (SPEC §14.5 Copy; ported from mock docs.js plainText). No LLM.

/** One section's body: its text, a skills group per line, or each item's heading line and "•" bullets. */
export function sectionText(s: Section): string {
  if ("text" in s) return s.text;
  if (s.kind === "skills") return s.items.map((i) => `${i.heading}: ${i.line ?? ""}`).join("\n");
  const blocks = s.items.map((i) =>
    [i.heading === s.title ? "" : [i.heading, i.sub].filter(Boolean).join(", ") + (i.meta ? ` (${i.meta})` : ""), i.line, ...(i.bullets ?? []).map((b) => `• ${b.text}`)]
      .filter(Boolean)
      .join("\n")
  );
  return blocks.join(s.items.some((i) => i.bullets?.length) ? "\n\n" : "\n");
}

/** "https://www.linkedin.com/in/x/" → "linkedin.com/in/x": how a link reads on a resume (common.typ does the same). */
export const shortUrl = (u = "") => u.trim().replace(/^https?:\/\/(www\.)?/i, "").replace(/\/+$/, "");

export function plainText(doc: Pick<ResumeDocument, "kind" | "sections" | "recipient">, kb: KnowledgeBase, brief: Pick<JobBrief, "title">, spelling: "en-AU" | "en-US"): string {
  const c = kb.contact;
  const visible = doc.sections.filter((s) => !s.hidden);
  const head = [c.name, [c.location, c.phone, c.email, shortUrl(c.linkedin), shortUrl(c.github)].filter(Boolean).join(" | ")];
  if (doc.kind === "coverLetter") {
    return [...head, "", `Re: ${brief.title}`, "", `Dear ${doc.recipient?.name ?? "Hiring team"},`, "", ...visible.map((s) => `${sectionText(s)}\n`), "Kind regards,", c.name].join("\n");
  }
  if (spelling === "en-AU" && kb.workRights) head.push(kb.workRights.status); // the Australian convention
  return [...head, ...visible.map((s) => `\n${s.title.toUpperCase()}\n${sectionText(s)}`)].join("\n");
}
