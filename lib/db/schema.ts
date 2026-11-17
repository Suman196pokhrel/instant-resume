import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// SQLite tables (SPEC §7.1). JSON columns are validated with the lib/schemas Zod schemas on read and on write.
export const KB_TYPES = ["contact", "workRights", "role", "portfolio", "education", "skills", "credential", "referee", "volunteering", "additional"] as const;

export const kbEntries = sqliteTable("kb_entries", {
  id: text("id").primaryKey(),
  type: text("type", { enum: KB_TYPES }).notNull(),
  position: integer("position").notNull(),
  data: text("data", { mode: "json" }).notNull().$type<unknown>(),
  schemaVersion: integer("schema_version").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  company: text("company").notNull(),
  role: text("role").notNull(),
  location: text("location").notNull(),
  jdText: text("jd_text").notNull(),
  brief: text("brief", { mode: "json" }).notNull().$type<unknown>(),
  selected: text("selected", { mode: "json" }).notNull().$type<unknown>(),
  source: text("source", { enum: ["studio", "quick"] }).notNull(),
  coverLetterOff: integer("cover_letter_off", { mode: "boolean" }).notNull().default(false),
  gaps: text("gaps", { mode: "json" }).$type<unknown>(),
  notes: text("notes"),
  schemaVersion: integer("schema_version").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const documents = sqliteTable("documents", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  kind: text("kind", { enum: ["resume", "coverLetter"] }).notNull(),
  content: text("content", { mode: "json" }).notNull().$type<unknown>(), // sections, recipient
  theme: text("theme", { mode: "json" }).notNull().$type<unknown>(),
  updatedAt: text("updated_at").notNull(),
});

export const revisions = sqliteTable("revisions", {
  id: text("id").primaryKey(),
  documentId: text("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  ts: text("ts").notNull(),
  kind: text("kind", { enum: ["generation", "rewrite", "edit", "adjustment", "structure", "restore"] }).notNull(),
  label: text("label").notNull(),
  coalesceKey: text("coalesce_key"),
  snapshot: text("snapshot", { mode: "json" }).notNull().$type<unknown>(),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value", { mode: "json" }).notNull().$type<unknown>(),
});
