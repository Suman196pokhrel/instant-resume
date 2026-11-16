import { notFound } from "next/navigation";
import { Content, TopBar } from "@/components/shell/TopBar";

// SPEC §13 section slugs. shortcut: hard-coded until TASK-3 adds the KB schema; move it there then.
const SECTIONS = ["contact", "workRights", "roles", "portfolio", "education", "skills", "credentials", "referees", "volunteering", "additional"];

export default async function Page({ params }: PageProps<"/kb/[section]">) {
  const { section } = await params;
  if (!SECTIONS.includes(section)) notFound();
  return (
    <>
      <TopBar title="Knowledge base" />
      <Content>
        <h1>Knowledge base</h1>
        <p className="mt-2 text-muted-foreground">
          Every fact here is entered once. Resumes and cover letters can only use what&apos;s stored here. Arrives with TASK-6.
        </p>
      </Content>
    </>
  );
}
