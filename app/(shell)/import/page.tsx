import { Content, TopBar } from "@/components/shell/TopBar";

export default function Page() {
  return (
    <>
      <TopBar title="Import resume" />
      <Content>
        <h1>Import your resume</h1>
        <p className="mt-2 text-muted-foreground">Paste or upload your resume and review what was found. Arrives with TASK-8.</p>
      </Content>
    </>
  );
}
