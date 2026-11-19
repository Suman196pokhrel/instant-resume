"use client";

import { useRouter } from "next/navigation";
import { Lock, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { toast } from "@/lib/toast";

/** Settings → Access (SPEC §4.1, §13.3 item 5, mock accessSettingsHtml): which mode this copy runs in. */
export function AccessSettings({ passwordMode }: { passwordMode: boolean }) {
  const router = useRouter();
  async function lockNow() {
    const res = await fetch("/api/lock", { method: "POST" }).catch(() => null);
    if (!res?.ok) return toast("Couldn't lock this device. Try again.", { kind: "error" });
    toast("Locked. Enter the password to continue.");
    router.replace("/unlock?next=/settings");
  }
  return (
    <section className="mb-[34px]">
      <h2 className="mb-3.5">Access</h2>
      <div className="flex items-center justify-between gap-4 rounded-lg border border-line bg-surface px-4 py-3.5">
        <div>
          <strong>{passwordMode ? "Password lock is on" : "Local only"}</strong>{" "}
          <Pill variant={passwordMode ? "ok" : "default"} className="ml-1 align-[1px]">
            {passwordMode ? <Lock size={12} aria-hidden /> : <Shield size={12} aria-hidden />} {passwordMode ? "Protected" : "This computer only"}
          </Pill>
          <p className="mt-1.5 max-w-[620px] text-[12.5px] text-muted-foreground">
            {passwordMode
              ? "This copy runs on a server. Anyone who opens it needs the password. Each device stays unlocked for 30 days, or until you lock it."
              : "Instant Resume only accepts connections from this computer, so no password is needed. To use it from another device, run it on your server with APP_PASSWORD set and HTTPS. A private network such as Tailscale is safer still."}
          </p>
          {passwordMode && (
            <p className="mt-1.5 max-w-[620px] text-[12.5px] text-muted-foreground">
              To change the password, set a new <code>APP_PASSWORD</code> on the server and restart. That signs out every device.
            </p>
          )}
        </div>
        {passwordMode && (
          <Button variant="ghost" size="sm" onClick={lockNow}>
            <Lock size={14} /> Lock now
          </Button>
        )}
      </div>
    </section>
  );
}
