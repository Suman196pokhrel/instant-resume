import type { Layout } from "./types";

// Preview overlays (SPEC §9.1, §14.5): the templates' marks as boxes in % of the sheet, which stacks every page with
// no gap, so the boxes scale with the zoom and the paper size.

export type Box = { id: string; top: number; height: number; left: number; width: number };

/** line: one line's height in pt (base size × line height). Typst puts a mark at its paragraph's edge: a bullet's start
 * mark is its first line's cap height, its end mark its last baseline. Every box spans the text column. */
export function boxes(layout: Layout, pages: number, line: number): { sections: Box[]; bullets: Box[] } {
  const { w, h, marks } = layout;
  const total = h * Math.max(pages, 1);
  const margin = Math.min(...marks.filter((m) => m.k === "s").map((m) => m.x), w / 4);
  const y = (m: Layout["marks"][number]) => (m.page - 1) * h + m.y;
  const pair = (start: Layout["marks"][number]["k"], end: Layout["marks"][number]["k"], above: number, below: number) =>
    marks.flatMap((s) => {
      const e = s.k === start && marks.find((m) => m.k === end && m.id === s.id);
      if (!e) return [];
      const top = y(s) - above;
      return [{ id: s.id, top: (top / total) * 100, height: ((y(e) + below - top) / total) * 100, left: (margin / w) * 100, width: ((w - 2 * margin) / w) * 100 }];
    });
  // A section's end mark sits on the next heading's cap height, so its box stops half a line above that.
  return { sections: pair("s", "e", 0, -line * 0.45), bullets: pair("b", "be", line * 0.25, line * 0.3) };
}
