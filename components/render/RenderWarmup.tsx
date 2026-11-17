"use client";

import { useEffect } from "react";

// SPEC §9.1: the Typst worker loads on first entry to the Workspace or Quick generate, then stays for the session.
// The dynamic import keeps lib/render out of every other page's bundle.
export function RenderWarmup() {
  useEffect(() => {
    void import("@/lib/render/client").then((m) => m.warmUp());
  }, []);
  return null;
}
