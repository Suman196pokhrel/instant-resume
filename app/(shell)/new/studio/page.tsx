import { Content, TopBar } from "@/components/shell/TopBar";

export default function Page() {
  return (
    <>
      <TopBar title="New application / Studio" />
      <Content>
        <h1>Paste the job description</h1>
        <p className="mt-2 text-muted-foreground">Studio setup arrives with TASK-12.</p>
      </Content>
    </>
  );
}
