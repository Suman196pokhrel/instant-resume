/// <reference lib="webworker" />
import { createTypstCompiler, type TypstCompiler } from "@myriaddreamin/typst.ts/compiler";
import { loadFonts } from "@myriaddreamin/typst.ts/options.init";
import type { RenderReply, RenderRequest } from "./types";

// Typst renderer (SPEC §9.1): loads the compiler WASM, the bundled fonts and the templates once, then compiles
// a document from /data.json on each message. Runs in a Web Worker so typing never waits on it.
const FONTS = ["LiberationSans", "Carlito", "Inter"].flatMap((family) =>
  ["Regular", "Bold", "Italic", "BoldItalic"].map((style) => `/fonts/${family}-${style}.ttf`)
);
const TEMPLATES = {
  "/common.typ": new URL("./templates/common.typ", import.meta.url),
  "/resume.typ": new URL("./templates/resume.typ", import.meta.url),
  "/letter.typ": new URL("./templates/letter.typ", import.meta.url),
};
const MAIN = { resume: "/resume.typ", coverLetter: "/letter.typ" } as const;

let ready: Promise<TypstCompiler> | undefined;
function compiler() {
  ready ??= (async () => {
    const c = createTypstCompiler();
    await c.init({
      getModule: () => new URL("@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm", import.meta.url),
      // Only the bundled fonts: no CDN fallback (CSP blocks it anyway) and no system fonts.
      beforeBuild: [loadFonts(FONTS, { assets: false })],
    });
    for (const [path, url] of Object.entries(TEMPLATES)) c.addSource(path, await (await fetch(url)).text());
    return c;
  })();
  return ready;
}

const dateEnAU = () => new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "long", year: "numeric" }).format(new Date());

self.onmessage = async ({ data: msg }: MessageEvent<RenderRequest>) => {
  const t0 = performance.now();
  try {
    const c = await compiler();
    c.mapShadow("/data.json", new TextEncoder().encode(JSON.stringify({ date: dateEnAU(), ...msg.data })));
    const out = await c.runWithWorld({ mainFilePath: MAIN[msg.kind] }, async (world) => {
      const compiled = await world.compile({ diagnostics: "unix" });
      if (compiled.hasError) throw new Error(String(compiled.diagnostics?.join("\n") ?? "Typst compile failed"));
      const [pages] = (await world.query<number[]>({ selector: "<pages>", field: "value" })) ?? [];
      const pdf = await world.pdf({ diagnostics: "unix" });
      if (!pdf.result) throw new Error(String(pdf.diagnostics?.join("\n") ?? "PDF export failed"));
      return { pages: Number(pages) || 0, artifact: pdf.result };
    });
    const reply: RenderReply = { id: msg.id, ...out, ms: Math.round(performance.now() - t0) };
    self.postMessage(reply, [out.artifact.buffer]);
  } catch (e) {
    self.postMessage({ id: msg.id, error: e instanceof Error ? e.message : String(e) } satisfies RenderReply);
  }
};

// Start downloading the WASM and fonts as soon as the worker exists (warm-up), not on the first compile.
void compiler();
