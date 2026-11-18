"use client";

import { useSyncExternalStore } from "react";
import { getActiveModel, listConnections, LLM_CHANGED, type Connection } from "@/lib/keystore";
import type { ActiveModel } from "@/lib/schemas/settings";
import { provider } from "./providers";

/** The listed models this connection can use: the key test's result, or every listed model for older connections. */
export const modelsFor = (c: Connection) => provider(c.provider).models.filter((m) => !c.available || c.available.includes(m));

/** The connection's saved model, or its provider's first usable one when that model was retired. */
export function defaultModel(c: Connection): string | null {
  const models = modelsFor(c);
  return models.includes(c.model) ? c.model : (models[0] ?? null);
}

/** The active model if its provider is connected; a retired model falls back to the provider's default. */
export function resolveChoice(active: ActiveModel | null, conns: Connection[]): ActiveModel | null {
  const c = active && conns.find((x) => x.provider === active.provider);
  if (!c) return null;
  const model = modelsFor(c).includes(active.model) ? active.model : defaultModel(c);
  return model ? { provider: c.provider, model } : null;
}

type Choice = { connections: Connection[] | null; active: ActiveModel | null };
const SERVER: Choice = { connections: null, active: null };
let snapshot: Choice = SERVER;
const listeners = new Set<() => void>();

let latest = 0;
async function refresh() {
  const run = ++latest;
  const connections = await listConnections().catch(() => [] as Connection[]); // IndexedDB unavailable: nothing connected
  if (run !== latest) return; // a newer refresh started: its answer wins
  snapshot = { connections, active: resolveChoice(getActiveModel(), connections) };
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    window.addEventListener(LLM_CHANGED, refresh);
    window.addEventListener("storage", refresh); // another tab changed the active model
  }
  refresh();
  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      window.removeEventListener(LLM_CHANGED, refresh);
      window.removeEventListener("storage", refresh);
    }
  };
}

/** Connected providers and the active model, shared by every model picker and Settings. `connections` is null while loading. */
export const useLlmChoice = () => useSyncExternalStore(subscribe, () => snapshot, () => SERVER);
