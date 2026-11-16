import type { Metadata } from "next";
import { Schibsted_Grotesk } from "next/font/google";
import { connection } from "next/server";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const sans = Schibsted_Grotesk({ variable: "--font-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Instant Resume",
  description: "Tailored resumes and cover letters from your own knowledge base.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Render per request so Next.js can stamp the proxy's CSP nonce on its scripts (SPEC §4).
  await connection();
  return (
    <html lang="en-AU" className={sans.variable}>
      <body>
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}
