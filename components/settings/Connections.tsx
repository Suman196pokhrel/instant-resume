"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ExternalLink, KeyRound } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Field } from "@/components/ui/field";
import { Input, NativeSelect } from "@/components/ui/input";
import { Pill } from "@/components/ui/pill";
import { getActiveModel, listConnections, removeConnection, saveConnection, setActiveModel, setConnectionModel, type Connection } from "@/lib/keystore";
import { keyFormatError, maskKey, PROVIDERS, testKey, type Provider } from "@/lib/llm/providers";
import type { ActiveModel } from "@/lib/schemas/settings";
import { toast } from "@/lib/toast";

const DOT = { anthropic: "bg-prov-anthropic", openai: "bg-prov-openai", gemini: "bg-prov-gemini" } as const;
const card = "flex flex-col gap-3 rounded-lg border border-line p-4";

/** Settings → Connections (SPEC §8.2, §13.3, mock Views.settings). Keys stay encrypted in this browser. */
export function Connections() {
  const [conns, setConns] = useState<Connection[] | null>(null);
  const [active, setActive] = useState<ActiveModel | null>(null);
  const [justConnected, setJustConnected] = useState<string | null>(null);

  const refresh = async () => {
    setConns(await listConnections());
    setActive(getActiveModel());
  };
  useEffect(() => {
    let live = true;
    listConnections().then(
      (list) => {
        if (!live) return;
        setConns(list);
        setActive(getActiveModel());
      },
      () => live && setConns([]) // IndexedDB unavailable: show the empty cards
    );
    return () => {
      live = false;
    };
  }, []);

  const choose = (next: ActiveModel | null) => {
    setActiveModel(next);
    setActive(next);
  };

  async function connected(p: Provider, model: string) {
    const list = await listConnections();
    if (!active || !list.some((c) => c.provider === active.provider)) choose({ provider: p.id, model });
    setJustConnected(p.id);
    await refresh();
    toast(`${p.name} connected`);
  }

  async function remove(p: Provider) {
    await removeConnection(p.id);
    const rest = (await listConnections())[0];
    if (active?.provider === p.id) choose(rest ? { provider: rest.provider, model: rest.model } : null);
    await refresh();
    toast(`${p.name} key removed`);
  }

  async function changeModel(c: Connection, model: string) {
    await setConnectionModel(c.provider, model);
    if (active?.provider === c.provider) choose({ provider: c.provider, model });
    await refresh();
  }

  return (
    <section className="mb-[34px]">
      <h2 className="mb-1">Connections</h2>
      <p className="mb-3.5 text-muted-foreground">Bring your own API key. You pay your provider directly; switching models is one click from the top bar.</p>
      <Collapsible className="mb-3.5 rounded-lg border border-line bg-surface px-3.5 py-2.5">
        <CollapsibleTrigger className="text-sm font-medium text-ink">
          <KeyRound className="size-[15px]" /> How to get an API key
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ol className="mt-2.5 mb-1.5 flex list-decimal flex-col gap-1 pl-5">
            <li>
              Sign in to your provider&apos;s developer site:{" "}
              {PROVIDERS.map((p, i) => (
                <span key={p.id}>
                  <a href={p.keyUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5">
                    {p.name} <ExternalLink className="size-3" />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                  {i < PROVIDERS.length - 1 ? ", " : "."}
                </span>
              ))}
            </li>
            <li>Create a new API key and copy all of it.</li>
            <li>
              Paste it into that provider&apos;s card below and choose <strong>Test and save</strong>.
            </li>
          </ol>
          <p className="text-[13px] text-muted-foreground">
            API usage is billed by the provider, separately from chat subscriptions. Some providers offer a free tier; check their current pricing. One application usually uses a few
            thousand tokens.
          </p>
        </CollapsibleContent>
      </Collapsible>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3.5" aria-busy={conns === null}>
        {conns &&
          PROVIDERS.map((p) => {
            const c = conns.find((x) => x.provider === p.id);
            return c ? (
              <ConnectedCard
                key={p.id}
                p={p}
                c={c}
                inUse={active?.provider === p.id}
                fresh={justConnected === p.id}
                onUse={() => {
                  choose({ provider: p.id, model: c.model });
                  toast(`Now using ${c.model}`);
                }}
                onRemove={() => remove(p)}
                onModel={(m) => changeModel(c, m)}
              />
            ) : (
              <EmptyCard key={p.id} p={p} onConnected={(model) => connected(p, model)} />
            );
          })}
      </div>
    </section>
  );
}

function ConnectedCard({ p, c, inUse, fresh, onUse, onRemove, onModel }: { p: Provider; c: Connection; inUse: boolean; fresh: boolean; onUse: () => void; onRemove: () => void; onModel: (m: string) => void }) {
  return (
    <div className={cn(card, "bg-surface")} data-provider={p.id}>
      <div className="flex items-center gap-2">
        <span className={cn("size-2 flex-none rounded-full", DOT[p.id])} />
        <h3 className="flex-1">{p.name}</h3>
        {inUse && <Pill variant="ok">In use</Pill>}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-ink-2">
        <KeyRound className="size-[15px]" /> <code>{c.masked}</code>
        <span className="text-[13px] text-muted-foreground">Encrypted on this device</span>
      </div>
      {fresh && (
        <p role="status" className="flex items-center gap-[5px] text-[12.5px] text-ok">
          <Check className="size-3.5" /> Key works. Saved and encrypted on this device.
        </p>
      )}
      <Field id={`model-${p.id}`} label="Default model">
        <NativeSelect value={c.model} onChange={(e) => onModel(e.target.value)}>
          {p.models.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </NativeSelect>
      </Field>
      <div className="flex gap-2">
        {!inUse && (
          <Button variant="ghost" size="sm" onClick={onUse}>
            Use {p.name}
          </Button>
        )}
        <Button variant="danger-ghost" size="sm" onClick={onRemove}>
          Remove key
        </Button>
      </div>
    </div>
  );
}

function EmptyCard({ p, onConnected }: { p: Provider; onConnected: (model: string) => Promise<void> }) {
  const [key, setKey] = useState("");
  const [show, setShow] = useState(false);
  const [model, setModel] = useState(p.models[0]);
  const [error, setError] = useState("");
  const [testing, setTesting] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const fail = (message: string) => {
    setError(message);
    input.current?.focus();
  };

  async function testAndSave() {
    const formatError = keyFormatError(p.id, key);
    if (formatError) return fail(formatError); // checked before any request
    setTesting(true);
    const result = await testKey(p.id, key);
    if (!result.ok) {
      setTesting(false);
      return fail(result.message);
    }
    try {
      await saveConnection(p.id, key, maskKey(p.id, key.trim()), model);
      await onConnected(model);
    } catch {
      setTesting(false);
      fail("Couldn't store the key in this browser. Check that site storage is allowed, then try again.");
    }
  }

  return (
    <div className={cn(card, "bg-surface-2")} data-provider={p.id}>
      <div className="flex items-center gap-2">
        <span className="size-2 flex-none rounded-full shadow-[inset_0_0_0_1.5px_var(--line-2)]" />
        <h3 className="flex-1">{p.name}</h3>
        <span className="text-[13px] text-muted-foreground">Not connected</span>
      </div>
      <Field
        id={`key-${p.id}`}
        label="API key"
        error={error}
        aside={
          <Button type="button" variant="ghost" size="sm" className="h-auto" onClick={() => setShow((s) => !s)} aria-pressed={show}>
            {show ? "Hide" : "Show"}
          </Button>
        }
      >
        <Input
          ref={input}
          type={show ? "text" : "password"}
          value={key}
          placeholder={`${p.prefix}…`}
          onChange={(e) => {
            setKey(e.target.value);
            setError("");
          }}
          onKeyDown={(e) => e.key === "Enter" && testAndSave()}
        />
      </Field>
      <Field id={`model-${p.id}`} label="Model">
        <NativeSelect value={model} onChange={(e) => setModel(e.target.value)}>
          {p.models.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </NativeSelect>
      </Field>
      <div className="flex gap-2">
        <Button size="sm" onClick={testAndSave} disabled={testing}>
          {testing ? "Testing key…" : "Test and save"}
        </Button>
      </div>
      <p className="text-[13px] text-muted-foreground">
        The key is checked with a small test call, then stored encrypted in this browser. It&apos;s never sent to our server or included in backups.
      </p>
    </div>
  );
}
