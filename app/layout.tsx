import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SiteHeader } from "@/components/site/site-header";
import { MobileBottomNav } from "@/components/site/mobile-bottom-nav";
import { SplashGate } from "@/components/site/splash-gate";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Pop and Drop Party Rentals",
  description: "Bounce houses and inflatable party rentals. Book online in minutes.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          <SplashGate minimumMs={900}>
            <SiteHeader />
            {children}
            <MobileBottomNav />
          </SplashGate>
        </ThemeProvider>
      </body>
    </html>
  );
}
