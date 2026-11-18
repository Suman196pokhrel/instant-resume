import { notFound } from "next/navigation";
import { LlmProbe } from "@/components/dev/LlmProbe";
import { Content, TopBar } from "@/components/shell/TopBar";
import { devUiEnabled } from "@/lib/dev";

// Development-only LLM probe (TASK-10): one structured call to a real provider, straight from the browser.
export default function Page() {
  if (!devUiEnabled()) notFound();
  return (
    <>
      <TopBar title="Dev · LLM adapter" />
      <Content>
        <h1>LLM adapter</h1>
        <p className="mt-2 mb-7 text-muted-foreground">Sends one small structured request with the key below. The key isn&apos;t saved.</p>
        <LlmProbe />
      </Content>
    </>
  );
}
