import { Connections } from "@/components/settings/Connections";
import { Content, TopBar } from "@/components/shell/TopBar";

// Settings (SPEC §13.3). Quick generate defaults, preferences, your data and access join with their own cards.
export default function Page() {
  return (
    <>
      <TopBar title="Settings" />
      <Content>
        <div className="mb-[22px]">
          <h1>Settings</h1>
          <p className="mt-1.5 text-muted-foreground">Connections, preferences and your data.</p>
        </div>
        <Connections />
      </Content>
    </>
  );
}
