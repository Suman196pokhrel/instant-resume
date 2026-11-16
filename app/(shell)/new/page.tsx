import { Content, TopBar } from "@/components/shell/TopBar";

export default function Page() {
  return (
    <>
      <TopBar title="New application" />
      <Content>
        <h1>New application</h1>
        <p className="mt-2 text-muted-foreground">Choose Quick generate or Studio. Arrives with TASK-12.</p>
      </Content>
    </>
  );
}
