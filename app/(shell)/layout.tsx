import { AppShell } from "@/components/shell/AppShell";

export default function ShellLayout({ children }: LayoutProps<"/">) {
  return <AppShell server={!!process.env.APP_PASSWORD}>{children}</AppShell>; // password mode: the data is on a server
}
