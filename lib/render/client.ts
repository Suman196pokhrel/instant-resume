import type { RenderInput, RenderKind, RenderReply, RenderResult } from "./types";

// Browser side of the renderer: starts the worker on first use (it downloads the Typst WASM and fonts once per session).
let worker: Worker | undefined;
let nextId = 0;
const pending = new Map<number, { resolve: (r: RenderResult) => void; reject: (e: Error) => void }>();

function start(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
  worker.onmessage = ({ data }: MessageEvent<RenderReply>) => {
    const p = pending.get(data.id);
    pending.delete(data.id);
    if (!p) return;
    if ("error" in data) p.reject(new Error(data.error));
    else p.resolve(data);
  };
  return worker;
}

/** Starts loading the renderer without compiling anything (Workspace and Quick generate warm it up on entry). */
export function warmUp() {
  start();
}

export function render(kind: RenderKind, data: RenderInput): Promise<RenderResult> {
  const id = ++nextId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    start().postMessage({ type: "compile", id, kind, data, format: "pdf" });
  });
}
