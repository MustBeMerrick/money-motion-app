import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Sidebar } from "@/components/sidebar";
import { FloatingDailyBudget } from "@/components/floating-daily-budget";
import { getDashboardData } from "@/lib/data";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MoneyMotion",
  description: "Simple. Smart. In Motion.",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { snapshot } = await getDashboardData();

  return (
    <html lang="en" className={inter.variable}>
      <body>
        <Sidebar />
        <FloatingDailyBudget
          dailyBudgetCents={snapshot.dailyBudgetCents}
          tomorrowBudgetCents={snapshot.tomorrowBudgetCents}
          plannedNetCents={snapshot.plannedNetCents}
        />
        <main className="ml-60 min-h-screen px-8 py-7">{children}</main>
      </body>
    </html>
  );
}
