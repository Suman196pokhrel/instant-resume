import { checkStartup } from "@/lib/access/startup";

// SPEC §4.1: refuse to serve the knowledge base beyond this computer without the password lock.
// shortcut: reads only the HOST env var, so `pnpm dev -H 0.0.0.0` bypasses it; check the real bind address if self-hosters hit this.
const error = checkStartup({ HOST: process.env.HOST, APP_PASSWORD: process.env.APP_PASSWORD });
if (error) {
  console.error(`\nInstant Resume did not start: ${error}\n`);
  process.exit(1);
}
