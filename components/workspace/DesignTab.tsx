"use client";

import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { RotateCcw, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useWorkspace } from "@/lib/stores/workspace";
import { ACCENT_SWATCHES, FONTS, THEME_DEFAULTS, type Theme } from "@/lib/schemas/theme";

// Inspector, Design tab (SPEC §14.5, mock renderDesign): every change goes straight to the renderer. No LLM call.

type Num = { [K in keyof Theme]: Theme[K] extends number ? K : never }[keyof Theme];
const SIZES: [Num, string, number, number, number, string][] = [
  ["baseSize", "Body text", 9, 12, 0.5, "pt"],
  ["headingSize", "Section headings", 10, 15, 0.5, "pt"],
  ["nameSize", "Your name", 16, 30, 1, "pt"],
];
const SPACING: [Num, string, number, number, number, string][] = [
  ["margin", "Page margins", 10, 25, 1, "mm"],
  ["lineHeight", "Line spacing", 1.1, 1.7, 0.05, ""],
  ["sectionGap", "Space between sections", 4, 24, 1, "pt"],
];
const SAMPLE: Record<Theme["font"], string> = { "Liberation Sans": "font-sample-liberation", Carlito: "font-sample-carlito", Inter: "font-sample-inter" };
const atDefaults = (t: Theme) => (Object.keys(THEME_DEFAULTS) as (keyof Theme)[]).every((k) => String(t[k]).toLowerCase() === String(THEME_DEFAULTS[k]).toLowerCase()); // the colour input gives lower case

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section aria-label={label} className="flex flex-col gap-3 border-b border-line pb-4">
      <h4 className="text-[13px] font-semibold">{label}</h4>
      {children}
    </section>
  );
}

export function DesignTab() {
  const theme = useWorkspace((s) => s.docs[s.kind]?.theme);
  const setTheme = useWorkspace((s) => s.setTheme);
  const resetTheme = useWorkspace((s) => s.resetTheme);
  const ms = useWorkspace((s) => s.renderMs);
  if (!theme) return null;
  const sliders = (rows: typeof SIZES) =>
    rows.map(([k, label, min, max, step, unit]) => (
      <Slider key={k} label={label} unit={unit} min={min} max={max} step={step} value={theme[k]} onValueChange={(v) => setTheme({ [k]: v as number })} />
    ));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2.5 rounded-md bg-accent-soft px-3 py-2.5 text-[13px] text-ink">
        <Zap aria-hidden className="mt-0.5 size-3.5 shrink-0 text-primary" />
        <div>
          <strong>Instant, and free.</strong> Design changes go straight to the renderer. No LLM call, no tokens.
        </div>
      </div>
      <Group label="Font">
        <RadioGroup aria-label="Font" value={theme.font} onValueChange={(v) => setTheme({ font: v as Theme["font"] })} className="grid grid-cols-3 gap-1.5">
          {FONTS.map((f) => (
            <Radio.Root
              key={f}
              value={f}
              aria-label={f}
              className="flex cursor-pointer flex-col items-center gap-0.5 rounded-md border border-line px-1 pt-2.5 pb-2 outline-none transition-[border-color,background-color,box-shadow,scale] duration-(--t) ease-(--ease) hover:border-line-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-[0.96] data-checked:border-primary data-checked:bg-accent-soft data-checked:shadow-[inset_0_0_0_1px_var(--primary)]"
            >
              <span aria-hidden className={`text-[22px] leading-none ${SAMPLE[f]}`}>
                Aa
              </span>
              <span className="text-xs text-ink-2">{f}</span>
            </Radio.Root>
          ))}
        </RadioGroup>
      </Group>
      <Group label="Sizes">{sliders(SIZES)}</Group>
      <Group label="Spacing">{sliders(SPACING)}</Group>
      <Group label="Accent colour">
        <div className="flex flex-wrap gap-2">
          {ACCENT_SWATCHES.map((c) => {
            const on = theme.accent.toLowerCase() === c.toLowerCase();
            return (
              <button
                key={c}
                type="button"
                aria-label={`Accent ${c}`}
                aria-pressed={on}
                onClick={() => setTheme({ accent: c })}
                style={{ "--c": c } as React.CSSProperties}
                className="size-[30px] cursor-pointer rounded-full bg-(--c) swatch-edge outline-none transition-[box-shadow,scale] duration-(--t) ease-(--ease) hover:scale-[1.08] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary active:scale-[0.94] aria-pressed:shadow-[0_0_0_2px_var(--surface),0_0_0_4px_var(--c)]"
              />
            );
          })}
          <label title="Custom colour" className="relative size-[30px] cursor-pointer overflow-hidden rounded-full swatch-custom has-focus-visible:outline-2 has-focus-visible:outline-offset-4 has-focus-visible:outline-primary">
            <input type="color" aria-label="Custom accent colour" value={theme.accent} onChange={(e) => setTheme({ accent: e.target.value })} className="size-full cursor-pointer opacity-0" />
          </label>
        </div>
      </Group>
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" disabled={atDefaults(theme)} onClick={resetTheme}>
          <RotateCcw /> Reset to template defaults
        </Button>
        {ms !== null && <span className="text-[13px] text-muted-foreground">Last render {ms} ms</span>}
      </div>
    </div>
  );
}
