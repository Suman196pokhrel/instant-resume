import { defineConfig } from "drizzle-kit";

// `pnpm db:generate` writes SQL migrations from lib/db/schema.ts; `pnpm db:migrate` applies them.
export default defineConfig({ dialect: "sqlite", schema: "./lib/db/schema.ts", out: "./lib/db/migrations" });
