import { redirect } from "next/navigation";

// SPEC §13: /kb opens the default section.
export default function Page() {
  redirect("/kb/roles");
}
