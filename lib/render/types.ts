// Worker messages (SPEC §9.1). "pdf" for export and checks; "svg" for the Workspace preview (all pages, stacked).
export type RenderKind = "resume" | "coverLetter";
export type RenderInput = {
  document: unknown;
  kb: { contact: unknown; workRights?: unknown };
  brief?: { title: string };
  paper: "A4" | "Letter";
  spelling: "en-AU" | "en-US";
};
export type RenderRequest = { type: "compile"; id: number; kind: RenderKind; data: RenderInput; format: "pdf" | "svg" };
/** Where each section ("s" start, "e" end) and bullet ("b", "be") sits, in pt from its page's top-left (templates' layout()). */
export type Layout = { w: number; h: number; marks: { k: "s" | "e" | "b" | "be"; id: string; page: number; x: number; y: number }[] };
export type RenderResult = { pages: number; artifact: Uint8Array; svg?: string; layout?: Layout; ms: number };
export type RenderReply = ({ id: number } & RenderResult) | { id: number; error: string };
