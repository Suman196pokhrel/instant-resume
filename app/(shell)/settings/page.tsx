import { Content, TopBar } from "@/components/shell/TopBar";

export default function Page() {
  return (
    <>
      <TopBar title="Settings" />
      <Content>
        <h1>Settings</h1>
        <p className="mt-2 text-muted-foreground">Connections, Quick generate defaults, preferences, your data and access. Arrives with TASK-9.</p>
      </Content>
    </>
  );
}
