import type { Section } from "@/lib/schemas/document";

// The Proposal card's diff (SPEC §14.5), ported from mock docs.js wordDiff and sectionDiffHtml. No LLM.

export type Part = { t: "same" | "del" | "ins"; text: string };
export type BulletRow = { parts: Part[]; tag?: "from knowledge base" | "moved up" | "removed" };
export type ItemDiff = { head: string; line?: Part[]; bullets: BulletRow[] };
export type SectionDiff = { text?: Part[]; items?: ItemDiff[] };

/** A word-level diff (longest common subsequence over words and the spaces between them), runs merged. */
export function wordDiff(a: string, b: string): Part[] {
  const A = a.split(/(\s+)/).filter(Boolean);
  const B = b.split(/(\s+)/).filter(Boolean);
  const dp = Array.from({ length: A.length + 1 }, () => new Array<number>(B.length + 1).fill(0));
  for (let i = A.length - 1; i >= 0; i--) for (let j = B.length - 1; j >= 0; j--) dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out: Part[] = [];
  const push = (t: Part["t"], text: string) => (out.at(-1)?.t === t ? (out.at(-1)!.text += text) : out.push({ t, text }));
  let i = 0;
  let j = 0;
  while (i < A.length && j < B.length) {
    if (A[i] === B[j]) push("same", (j++, A[i++]));
    else if (dp[i + 1][j] >= dp[i][j + 1]) push("del", A[i++]);
    else push("ins", B[j++]);
  }
  while (i < A.length) push("del", A[i++]);
  while (j < B.length) push("ins", B[j++]);
  return out;
}

export function sectionDiff(before: Section, after: Section): SectionDiff {
  if ("text" in before && "text" in after) return { text: wordDiff(before.text, after.text) };
  if (!("items" in before) || !("items" in after)) return {};
  return {
    items: after.items.map((it) => {
      const old = before.items.find((x) => x.id === it.id);
      const oldBullets = old?.bullets ?? [];
      const bullets: BulletRow[] = (it.bullets ?? []).map((b, j) => {
        const oi = oldBullets.findIndex((x) => x.id === b.id);
        const tag = oi < 0 ? "from knowledge base" : oi > j ? "moved up" : undefined;
        return { parts: wordDiff(oldBullets[oi]?.text ?? "", b.text), tag };
      });
      for (const ob of oldBullets) if (!it.bullets?.some((b) => b.id === ob.id)) bullets.push({ parts: [{ t: "del", text: ob.text }], tag: "removed" });
      return { head: it.sub || it.heading, line: it.line === undefined ? undefined : wordDiff(old?.line ?? "", it.line), bullets };
    }),
  };
}
