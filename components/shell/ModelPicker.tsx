"use client";

import Link from "next/link";
import { ChevronDown, KeyRound } from "lucide-react";
import { cn } from "cn";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setActiveModel } from "@/lib/keystore";
import { PROVIDERS, provider, withArticle, type ProviderId } from "@/lib/llm/providers";
import { modelsFor, useLlmChoice } from "@/lib/llm/use-choice";
import { toast } from "@/lib/toast";

const DOT = { anthropic: "bg-prov-anthropic", openai: "bg-prov-openai", gemini: "bg-prov-gemini" } as const;

/** The model picker (SPEC §8.2, mock core.js modelPickerHtml): one click from anywhere; lists connected providers' models. */
export function ModelPicker() {
  const { connections, active } = useLlmChoice();
  const label = active ? provider(active.provider).name : null;
  const loading = connections === null; // until IndexedDB answers: same size, no "No model connected" flash

  function choose(value: string) {
    const [p, model] = value.split(":") as [ProviderId, string];
    setActiveModel({ provider: p, model });
    toast(`Switched to ${model}`);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex h-8 max-w-[52vw] items-center gap-2 rounded-sm border border-line-2 bg-surface px-2.5 text-[13px] font-medium whitespace-nowrap text-ink hover:border-muted-foreground"
        aria-label={loading ? "Change model" : active ? `Model: ${label} ${active.model}. Change model` : "No model connected. Change model"}
      >
        <span className={cn("size-2 flex-none rounded-full", active ? DOT[active.provider] : loading ? "" : "shadow-[inset_0_0_0_1.5px_var(--line-2)]")} />
        <span className={cn("overflow-hidden text-ellipsis", loading && "invisible")}>
          {active ? (
            <>
              <span className="font-normal text-muted-foreground max-[900px]:hidden">{label}</span> {active.model}
            </>
          ) : (
            "No model connected"
          )}
        </span>
        <ChevronDown className="size-3.5 flex-none" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[270px]">
        <DropdownMenuRadioGroup value={active ? `${active.provider}:${active.model}` : ""} onValueChange={choose}>
          {PROVIDERS.map((p) => {
            const c = connections?.find((x) => x.provider === p.id);
            return (
              <DropdownMenuGroup key={p.id} className="border-line not-first:mt-1 not-first:border-t not-first:pt-1">
                <DropdownMenuLabel className="flex justify-between font-semibold text-ink-2">
                  {p.name} {c && <span className="font-normal text-muted-foreground">{c.masked}</span>}
                </DropdownMenuLabel>
                {c && !modelsFor(c).length ? (
                  <p className="px-[9px] py-1.5 text-[13px] text-muted-foreground">No listed models are available to this key</p>
                ) : c ? (
                  modelsFor(c).map((m) => (
                    <DropdownMenuRadioItem key={m} value={`${p.id}:${m}`} className="data-checked:font-semibold data-checked:text-accent-ink">
                      {m}
                    </DropdownMenuRadioItem>
                  ))
                ) : (
                  <DropdownMenuItem render={<Link href="/settings" />} className="text-[13px] text-muted-foreground">
                    <KeyRound /> Add {withArticle(p.name)} key
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>
            );
          })}
        </DropdownMenuRadioGroup>
        <p className="mt-1 border-t border-line px-2 pt-2 pb-1 text-[11.5px] text-muted-foreground">Calls go straight from this browser to the provider.</p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
