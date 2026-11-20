"use client";

import { useEffect } from "react";

// SPEC §9.1: the Typst worker loads on first entry to the Workspace or Quick generate, then stays for the session.
// The dynamic import keeps lib/render out of every other page's bundle. `idle` (the Applications list) starts it once
// the page is idle instead, so opening an application shows its preview at once.
export function RenderWarmup({ idle = false }: { idle?: boolean }) {
  useEffect(() => {
    const go = () => void import("@/lib/render/client").then((m) => m.warmUp());
    if (!idle) return go();
    if (!("requestIdleCallback" in window)) {
      const t = setTimeout(go, 1000); // Safari has no requestIdleCallback
      return () => clearTimeout(t);
    }
    const id = requestIdleCallback(go, { timeout: 3000 });
    return () => cancelIdleCallback(id);
  }, [idle]);
  return null;
}
