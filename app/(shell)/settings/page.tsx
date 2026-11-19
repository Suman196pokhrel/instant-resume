import { Connections } from "@/components/settings/Connections";
import { PrefsSettings } from "@/components/settings/Prefs";
import { Content, TopBar } from "@/components/shell/TopBar";
import { getDb } from "@/lib/db/client";
import { readPrefs } from "@/lib/db/settings";

// Settings (SPEC §13.3). Preferences, your data and access join with their own cards.
export default async function Page() {
  const prefs = await readPrefs(await getDb());
  return (
    <>
      <TopBar title="Settings" />
      <Content>
        <div className="mb-[22px]">
          <h1>Settings</h1>
          <p className="mt-1.5 text-muted-foreground">Connections, preferences and your data.</p>
        </div>
        <Connections />
        <PrefsSettings initial={prefs} />
      </Content>
    </>
  );
}
