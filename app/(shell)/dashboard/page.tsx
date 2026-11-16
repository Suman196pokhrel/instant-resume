import { Content, TopBar } from "@/components/shell/TopBar";

export default function Page() {
  return (
    <>
      <TopBar title="Applications" />
      <Content>
        <h1>Applications</h1>
        <p className="mt-2 text-muted-foreground">One job description, a tailored resume and a cover letter. Everything saves automatically.</p>
      </Content>
    </>
  );
}
