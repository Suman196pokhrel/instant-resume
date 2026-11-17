// Worker messages (SPEC §9.1). Vector output for the live preview comes with the Workspace (TASK-15).
export type RenderKind = "resume" | "coverLetter";
export type RenderInput = {
  document: unknown;
  kb: { contact: unknown; workRights?: unknown };
  brief?: { title: string };
  paper: "A4" | "Letter";
  spelling: "en-AU" | "en-US";
};
export type RenderRequest = { type: "compile"; id: number; kind: RenderKind; data: RenderInput; format: "pdf" };
export type RenderResult = { pages: number; artifact: Uint8Array; ms: number };
export type RenderReply = ({ id: number } & RenderResult) | { id: number; error: string };
