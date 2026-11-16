import { Content, TopBar } from "@/components/shell/TopBar";

export default function Page() {
  return (
    <>
      <TopBar title="New application / Quick generate" />
      <Content>
        <h1>Paste a job description</h1>
        <p className="mt-2 text-muted-foreground">Quick generate arrives with TASK-24.</p>
      </Content>
    </>
  );
}
