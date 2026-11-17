import { notFound } from "next/navigation";
import { Content, TopBar } from "@/components/shell/TopBar";
import { RenderProbe } from "@/components/dev/RenderProbe";
import { devUiEnabled } from "@/lib/dev";

// Development-only Typst spike harness (TASK-5): compile the sample documents, time re-renders, download the PDFs.
export default function Page() {
  if (!devUiEnabled()) notFound();
  return (
    <>
      <TopBar title="Dev · Typst renderer" />
      <Content>
        <h1>Typst renderer</h1>
        <p className="mt-2 mb-7 text-muted-foreground">Compiles the sample resume and cover letter in the worker.</p>
        <RenderProbe />
      </Content>
    </>
  );
}
