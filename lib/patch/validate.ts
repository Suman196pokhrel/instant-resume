import { documentSchema, type ResumeDocument } from "@/lib/schemas/document";
import type { KnowledgeBase } from "@/lib/schemas/kb";
import { newId } from "@/lib/utils";

// Patch validator (SPEC §8.3): every LLM change to a document passes through here. The ops are applied to a copy
// by a small RFC 6902 subset (only what the whitelists allow), so a rejection never touches the original.

export type Op =
  | { op: "replace"; path: string; value: string }
  | { op: "add"; path: string; value: { text: string; source: string } }
  | { op: "remove"; path: string }
  | { op: "move"; from: string; path: string };
export type Rules = { op: Op["op"]; path: RegExp }[];
export type PatchResult<D> = { ok: true; doc: D; count: number } | { ok: false; reason: string };

/** Generation fills the skeleton: summary and paragraph text, new bullets, and the order of a skills line. */
export const GENERATION: Rules = [
  { op: "replace", path: /^\/sections\/\d+\/text$/ },
  { op: "add", path: /^\/sections\/\d+\/items\/\d+\/bullets\/-$/ },
  { op: "replace", path: /^\/sections\/\d+\/items\/\d+\/line$/ },
];

/** A rewrite stays inside section i: its text, lines and bullets (edit, reorder within an item, add, remove). */
export function rewriteRules(i: number): Rules {
  const s = `^/sections/${i}`;
  const bullet = `${s}/items/\\d+/bullets/\\d+`;
  return [
    { op: "replace", path: new RegExp(`${s}/text$`) },
    { op: "replace", path: new RegExp(`${s}/items/\\d+/line$`) },
    { op: "replace", path: new RegExp(`${bullet}/text$`) },
    { op: "move", path: new RegExp(`${bullet}$`) },
    { op: "add", path: new RegExp(`${s}/items/\\d+/bullets/(\\d+|-)$`) },
    { op: "remove", path: new RegExp(`${bullet}$`) },
  ];
}

class Reject extends Error {}
const fail = (reason: string): never => {
  throw new Reject(reason);
};

/** The parent container and key a JSON pointer names; every step on the way must exist. */
function locate(root: unknown, pointer: string): { parent: unknown; key: string } {
  const segs = pointer.split("/").slice(1).map((s) => s.replaceAll("~1", "/").replaceAll("~0", "~"));
  let parent = root;
  for (const seg of segs.slice(0, -1)) parent = has(parent, seg) ? (parent as Record<string, unknown>)[seg] : fail(`${pointer} doesn't exist`);
  return { parent, key: segs.at(-1)! };
}
const index = (a: unknown[], key: string, max = a.length - 1) => (/^\d+$/.test(key) && +key <= max ? +key : fail(`index ${key} is out of range`));
const has = (parent: unknown, key: string) =>
  Array.isArray(parent) ? /^\d+$/.test(key) && +key < parent.length : typeof parent === "object" && parent !== null && Object.hasOwn(parent, key);
const array = (parent: unknown, pointer: string) => (Array.isArray(parent) ? parent : fail(`${pointer} isn't a list`));

function apply(doc: unknown, op: Op) {
  const { parent, key } = locate(doc, op.path);
  switch (op.op) {
    case "replace": {
      if (!has(parent, key) || typeof (parent as Record<string, unknown>)[key] !== "string") fail(`${op.path} isn't text`);
      if (typeof op.value !== "string" || !op.value.trim()) fail(`${op.path} needs text`); // a bullet goes with remove, never blank text
      (parent as Record<string, unknown>)[key] = op.value;
      return;
    }
    case "add": {
      const list = array(parent, op.path);
      const { text, source } = (op.value ?? {}) as { text?: unknown; source?: unknown };
      if (typeof text !== "string" || !text.trim() || typeof source !== "string") fail(`${op.path} needs a bullet with text and a source`);
      list.splice(key === "-" ? list.length : index(list, key, list.length), 0, { id: newId("b"), text, source }); // the app owns IDs
      return;
    }
    case "remove": {
      const list = array(parent, op.path);
      list.splice(index(list, key), 1);
      return;
    }
    case "move": {
      const from = locate(doc, op.from);
      const list = array(parent, op.path);
      if (from.parent !== list) fail(`${op.from} can only move within its own list`);
      const [moved] = list.splice(index(list, from.key), 1);
      list.splice(index(list, key, list.length), 0, moved);
    }
  }
}

/** Skills on a line, split on commas outside parentheses: "AWS (Lambda, ECS, SQS)" is one skill. */
export const splitSkills = (line: string) => line.split(/,(?![^(]*\))/).map((s) => s.trim()).filter(Boolean);

/** Everything a patch may not change: the document minus text and bullets, with each skills line as a sorted set. */
function frame(doc: ResumeDocument) {
  return {
    ...doc,
    sections: doc.sections.map((s) =>
      "items" in s
        ? { ...s, items: s.items.map(({ bullets, ...i }) => ({ ...i, bullets: !!bullets, line: s.kind === "skills" ? splitSkills(i.line ?? "").sort() : i.line })) }
        : { ...s, text: null }
    ),
  };
}

const bulletsOf = (doc: ResumeDocument) => doc.sections.flatMap((s) => ("items" in s ? s.items.flatMap((i) => (i.bullets ?? []).map((b) => ({ ref: i.ref, b }))) : []));

/** Each KB entry's highlight IDs, by entry ID. */
function highlightOwners(kb: KnowledgeBase) {
  return new Map([...kb.roles, ...(kb.volunteering ?? []), ...kb.portfolio].map((e) => [e.id, new Set(e.highlights.map((h) => h.id))]));
}

export function validatePatch<D extends ResumeDocument>(doc: D, ops: Op[], { rules, kb }: { rules: Rules; kb: KnowledgeBase }): PatchResult<D> {
  try {
    const copy = structuredClone(doc);
    for (const op of ops) {
      const allowed = (p: string) => rules.some((r) => r.op === op.op && r.path.test(p));
      if (!allowed(op.path) || (op.op === "move" && !allowed(op.from))) fail(`${op.op} ${op.path} isn't allowed`);
      apply(copy, op);
    }
    const parsed = documentSchema.safeParse(copy);
    if (!parsed.success) fail("the result isn't a valid document");
    if (JSON.stringify(frame(doc)) !== JSON.stringify(frame(copy))) // same key order: the copy is a structuredClone patched in place
       fail("the patch changed something outside text and bullets");
    // Only bullets this patch adds: an older bullet whose highlight was since deleted mustn't block every later rewrite.
    const owners = highlightOwners(kb);
    const old = new Set(bulletsOf(doc).map(({ b }) => b.id));
    for (const { ref, b } of bulletsOf(copy)) if (!old.has(b.id) && !owners.get(ref)?.has(b.source)) fail(`${b.source} isn't a highlight of ${ref}`);
    return { ok: true, doc: copy, count: ops.length };
  } catch (e) {
    if (e instanceof Reject) return { ok: false, reason: e.message };
    return { ok: false, reason: "the patch couldn't be applied" };
  }
}
