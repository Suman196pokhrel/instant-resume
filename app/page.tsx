import { redirect } from "next/navigation";
import { getDb } from "@/lib/db/client";
import { readKb } from "@/lib/db/kb";

// SPEC §13: no knowledge base yet → onboarding; otherwise the dashboard.
export default async function Home() {
  redirect((await readKb(await getDb())) ? "/dashboard" : "/onboarding");
}
