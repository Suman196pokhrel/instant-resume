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
export type RenderResult = { pages: number; artifact: Uint8Array; svg?: string; ms: number };
export type RenderReply = ({ id: number } & RenderResult) | { id: number; error: string };
