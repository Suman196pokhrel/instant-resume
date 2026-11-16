import { AppShell } from "@/components/shell/AppShell";

export default function ShellLayout({ children }: LayoutProps<"/">) {
  return <AppShell>{children}</AppShell>;
}
