import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";
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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <Sidebar />
        <Suspense fallback={null}>
          <DailyBudgetSlot />
        </Suspense>
        <main className="min-h-screen px-4 pt-5 pb-7 lg:ml-60 lg:px-8 lg:pt-7">{children}</main>
      </body>
    </html>
  );
}
