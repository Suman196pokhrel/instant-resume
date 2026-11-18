"use client";

import { useState } from "react";
import { z } from "zod";
import { LlmErrorCallout } from "@/components/llm/LlmErrorCallout";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, NativeSelect } from "@/components/ui/input";
import { createAdapter, languageModel } from "@/lib/llm/adapter";
import { LlmError } from "@/lib/llm/errors";
import { PROVIDERS, provider, type ProviderId } from "@/lib/llm/providers";

const schema = z.object({ ok: z.boolean() });

/** One tiny structured call through the real adapter, straight from this browser (the SPEC §8.1 CORS check). */
export function LlmProbe() {
  const [id, setId] = useState<ProviderId>("anthropic");
  const [model, setModel] = useState(PROVIDERS[0].models[0]);
  const [key, setKey] = useState("");
  const [state, setState] = useState<{ result?: string; error?: LlmError; running?: boolean }>({});

  async function run() {
    setState({ running: true });
    try {
      const { object, usage } = await createAdapter(languageModel(id, key.trim(), model), { provider: id, model }).generateObject({
        name: "ping",
        schema,
        system: "Return only the requested JSON.",
        prompt: 'Reply with {"ok": true}.',
      });
      setState({ result: JSON.stringify({ object, usage }) });
    } catch (e) {
      setState({ error: e instanceof LlmError ? e : new LlmError("other", "Something went wrong", String(e)) });
    }
  }

  return (
    <div className="flex max-w-[520px] flex-col gap-3.5">
      <Field id="probe-provider" label="Provider">
        <NativeSelect
          value={id}
          onChange={(e) => {
            const next = e.target.value as ProviderId;
            setId(next);
            setModel(provider(next).models[0]);
          }}
        >
          {PROVIDERS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field id="probe-model" label="Model">
        <NativeSelect value={model} onChange={(e) => setModel(e.target.value)}>
          {provider(id).models.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </NativeSelect>
      </Field>
      <Field id="probe-key" label="API key">
        <Input type="password" spellCheck={false} value={key} onChange={(e) => setKey(e.target.value)} />
      </Field>
      <div>
        <Button onClick={run} disabled={state.running}>
          {state.running ? "Calling…" : "Run test call"}
        </Button>
      </div>
      {state.result && (
        <p role="status" className="font-mono text-[12.5px]" data-testid="probe-result">
          {state.result}
        </p>
      )}
      {state.error && <LlmErrorCallout error={state.error} onRetry={run} />}
    </div>
  );
}
