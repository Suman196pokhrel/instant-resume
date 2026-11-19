"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { toast } from "@/lib/toast";

const waitText = (n: number) => `Too many attempts. Try again in ${n} ${n === 1 ? "second" : "seconds"}.`;

/** The unlock form (SPEC §13.3 Unlock screen, mock Views.unlock). It says nothing about how the server is set up. */
export function UnlockForm({ next }: { next: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [until, setUntil] = useState(0); // rate limited until this time (ms)
  const [left, setLeft] = useState(0);

  useEffect(() => input.current?.focus(), []);
  useEffect(() => {
    if (!until) return;
    const tick = () => {
      const s = Math.ceil((until - Date.now()) / 1000);
      setLeft(Math.max(s, 0));
      if (s <= 0) setUntil(0);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [until]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || left) return;
    if (!password) {
      setError("Enter the password");
      return input.current?.focus();
    }
    setBusy(true);
    const res = await fetch("/api/unlock", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }) }).catch(() => null);
    if (res?.ok) {
      toast("Unlocked on this device");
      return router.replace(next);
    }
    setBusy(false);
    const { retryAfter } = ((await res?.json().catch(() => null)) ?? {}) as { retryAfter?: number };
    setError("");
    if (retryAfter) setUntil(Date.now() + retryAfter * 1000);
    else setError(res ? "That password isn't right." : "Couldn't reach the server. Check your connection and try again.");
    input.current?.select();
  }

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-3.5">
      <Field
        id="unlock-password"
        label="Password"
        alert
        error={left ? waitText(left) : error}
        aside={
          <Button type="button" variant="ghost" size="sm" className="h-auto" onClick={() => setShow((s) => !s)} aria-pressed={show}>
            {show ? "Hide" : "Show"}
          </Button>
        }
      >
        <Input
          ref={input}
          type={show ? "text" : "password"}
          autoComplete="current-password"
          spellCheck={false}
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError("");
          }}
        />
      </Field>
      <Button type="submit" className="w-full" disabled={busy || left > 0}>
        {busy ? (
          <>
            <Loader2 aria-hidden className="animate-spin" /> Unlocking
          </>
        ) : (
          "Unlock"
        )}
      </Button>
    </form>
  );
}
