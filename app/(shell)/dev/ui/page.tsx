import { notFound } from "next/navigation";
import { Content, TopBar } from "@/components/shell/TopBar";
import { Gallery } from "@/components/dev/Gallery";
import { devUiEnabled } from "@/lib/dev";

// Development-only gallery of the shared components, for side-by-side review with mock/ (TASK-32, TASK-33).
export default function Page() {
  if (!devUiEnabled()) notFound();
  return (
    <>
      <TopBar title="Dev · Shared components" />
      <Content>
        <h1>Shared components</h1>
        <p className="mt-2 mb-7 text-muted-foreground">Every shared component in every state. Compare with the mock.</p>
        <Gallery />
      </Content>
    </>
  );
}
