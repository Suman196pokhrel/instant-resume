import { describe, expect, it } from "vitest";
import { boxes } from "@/lib/render/layout";
import type { Layout } from "@/lib/render/types";

// SPEC §9.1 preview positions (TASK-46): Typst marks → boxes in % of the stacked sheet (pages one after another).
const layout: Layout = {
  w: 600,
  h: 800,
  marks: [
    { k: "s", id: "sum", page: 1, x: 50, y: 100 },
    { k: "e", id: "sum", page: 1, x: 50, y: 300 },
    { k: "s", id: "exp", page: 1, x: 50, y: 700 },
    { k: "b", id: "b1", page: 2, x: 70, y: 40 },
    { k: "be", id: "b1", page: 2, x: 300, y: 60 },
    { k: "e", id: "exp", page: 2, x: 50, y: 400 },
  ],
};

describe("preview boxes", () => {
  it("places sections across stacked pages, inside the page margins, stopping short of the next heading (AC1)", () => {
    const { sections } = boxes(layout, 2, 12);
    expect(sections).toEqual([
      { id: "sum", top: (100 / 1600) * 100, height: ((300 - 12 * 0.45 - 100) / 1600) * 100, left: (50 / 600) * 100, width: (500 / 600) * 100 },
      { id: "exp", top: (700 / 1600) * 100, height: ((800 + 400 - 12 * 0.45 - 700) / 1600) * 100, left: (50 / 600) * 100, width: (500 / 600) * 100 },
    ]);
  });

  it("a bullet runs from its first line to its last, across the text column", () => {
    const [b] = boxes(layout, 2, 12).bullets;
    expect(b.id).toBe("b1");
    expect(b.top).toBeCloseTo(((800 + 40 - 12 * 0.25) / 1600) * 100); // the start mark is the first line's cap height
    expect(b.top + b.height).toBeCloseTo(((800 + 60 + 12 * 0.3) / 1600) * 100); // the end mark is the last baseline
    expect([b.left, b.width]).toEqual([(50 / 600) * 100, (500 / 600) * 100]); // the text column, marker included
  });

  it("ignores a section whose end mark is missing", () => {
    expect(boxes({ ...layout, marks: layout.marks.slice(0, 3) }, 2, 12).sections.map((s) => s.id)).toEqual(["sum"]);
  });
});
