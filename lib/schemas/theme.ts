import { z } from "zod";

// Document theme (SPEC §6.3): Design tab ranges and the Quick generate presets.
export const FONTS = ["Liberation Sans", "Carlito", "Inter"] as const;
export const ACCENT_SWATCHES = ["#0E7466", "#1F4E8C", "#7A2E5C", "#8A4B12", "#2E2E2E"] as const;

const range = (min: number, max: number) => z.number().min(min).max(max);

export const themeSchema = z.object({
  font: z.enum(FONTS),
  baseSize: range(9, 12), // pt, step 0.5
  headingSize: range(10, 15), // pt, step 0.5
  nameSize: range(16, 30), // pt, step 1
  margin: range(10, 25), // mm, step 1
  lineHeight: range(1.1, 1.7), // ×, step 0.05
  sectionGap: range(4, 24), // pt, step 1
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a colour like #0E7466"),
});

export type Theme = z.infer<typeof themeSchema>;

export const THEME_PRESETS = {
  classic: { font: "Liberation Sans", baseSize: 10.5, headingSize: 12, nameSize: 22, margin: 18, lineHeight: 1.35, sectionGap: 12, accent: "#0E7466" },
  modern: { font: "Inter", baseSize: 10, headingSize: 12, nameSize: 24, margin: 16, lineHeight: 1.4, sectionGap: 14, accent: "#1F4E8C" },
  compact: { font: "Carlito", baseSize: 10, headingSize: 11, nameSize: 18, margin: 12, lineHeight: 1.25, sectionGap: 8, accent: "#2E2E2E" },
} as const satisfies Record<string, Theme>;

export const THEME_DEFAULTS: Theme = THEME_PRESETS.classic;
