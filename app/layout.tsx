import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { RefreshProvider } from "@/lib/refresh-context";
import { Sidebar } from "@/components/sidebar";
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

// The floating budget card is deliberately NOT rendered here any more.
//
// A client refresh only re-renders the segments it marks stale, and Next 16
// routes router.refresh() through the segment cache, which invalidates and
// refetches per segment. The page segment comes back; this root layout does
// not. Anything reading the database from a layout therefore shows whatever it
// showed on first paint and never updates -- which is exactly what "I click a
// bill and the daily budget doesn't move" was. Measured: a refresh request
// carrying the current router state tree renders nothing at all server-side
// and returns a 64-byte empty diff.
//
// So the card is rendered by each page that wants it (see DailyBudgetSlot).
// getDashboardData is React-cache()d per request, so a page already reading it
// pays nothing extra. Neither net-worth-app nor option-pilot-app fetches data
// in a layout either.
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <RefreshProvider>
          <Sidebar />
          <main className="min-h-screen px-4 pt-5 pb-7 lg:ml-60 lg:px-8 lg:pt-7">{children}</main>
        </RefreshProvider>
      </body>
    </html>
  );
}
