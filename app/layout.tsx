import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Sidebar } from "@/components/sidebar";
import { DailyBudgetSlot } from "@/components/daily-budget-slot";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MoneyMotion",
  description: "Simple. Smart. In Motion.",
};

// iOS Safari zooms in on a focused field and never zooms back out; a 16px
// font alone doesn't stop it for the narrow click-to-edit inputs. Capping the
// scale does. Pinch-zoom still works — Safari has ignored userScalable since
// iOS 10 — so this only removes the automatic zoom.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const dynamic = "force-dynamic";

// The floating budget card is awaited inline rather than wrapped in Suspense.
// A boundary here splits every server action's response into a second,
// deferred chunk, and React will not commit a transition render while any
// boundary inside it is still waiting -- so a chunk that arrived late (or
// whose retry was never scheduled) left the whole page rendered but unpainted
// until some unrelated click forced a synchronous update. Costs the shell a
// few ms of streaming; worth it to keep every edit painting when it lands.
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <Sidebar />
        <DailyBudgetSlot />
        <main className="min-h-screen px-4 pt-5 pb-7 lg:ml-60 lg:px-8 lg:pt-7">{children}</main>
      </body>
    </html>
  );
}
