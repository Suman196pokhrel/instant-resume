import { Content, TopBar } from "@/components/shell/TopBar";

export default function Page() {
  return (
    <>
      <TopBar title="Set up your background" />
      <Content>
        <h1>Build your knowledge base</h1>
        <p className="mt-2 text-muted-foreground">Import a resume or enter your details manually. Arrives with TASK-7.</p>
      </Content>
    </>
  );
}
