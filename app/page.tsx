import { redirect } from "next/navigation";

// shortcut: always the dashboard; TASK-7 sends an empty knowledge base to /onboarding (SPEC §13).
export default function Home() {
  redirect("/dashboard");
}
