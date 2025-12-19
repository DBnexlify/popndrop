import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { MobileBottomNav } from "@/components/site/mobile-bottom-nav";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Pop and Drop Party Rentals | Bounce House Rentals in Ocala, FL",
  description: "Bounce house and inflatable party rentals in Ocala, Florida, Marion County, and surrounding areas. Water slides, themed bounce houses, and party inflatables delivered and set up. Book online in minutes!",
  keywords: "bounce house rental Ocala, inflatable rental Ocala FL, water slide rental Marion County, party rentals Ocala Florida, bounce house Ocala, inflatable party rentals, kids party rentals Ocala",
  openGraph: {
    title: "Pop and Drop Party Rentals | Ocala, FL",
    description: "Bounce house and inflatable rentals delivered and set up in Ocala, FL, Marion County, and surrounding areas. Book your party rental online!",
    type: "website",
    locale: "en_US",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning style={{ backgroundColor: 'oklch(0.145 0 0)' }}>
      <body className={`${geistSans.variable} ${geistMono.variable} flex min-h-screen flex-col antialiased`}>
        <ThemeProvider>
          {/* Site-wide background gradient */}
          <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
            {/* Base dark */}
            <div className="absolute inset-0 bg-background" />

            {/* Aurora gradient blobs - distributed for full coverage */}
            {/* Top center - fuchsia/pink */}
            <div className="absolute -top-32 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-fuchsia-500/20 blur-3xl" />
            
            {/* Top right - cyan */}
            <div className="absolute -top-20 right-[-120px] h-[500px] w-[500px] rounded-full bg-cyan-400/18 blur-3xl" />
            
            {/* Middle left - purple */}
            <div className="absolute top-[30%] left-[-200px] h-[550px] w-[550px] rounded-full bg-purple-500/16 blur-3xl" />
            
            {/* Middle right - cyan */}
            <div className="absolute top-[45%] right-[-150px] h-[480px] w-[480px] rounded-full bg-cyan-400/14 blur-3xl" />
            
            {/* Center - subtle fuchsia */}
            <div className="absolute top-[50%] left-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-fuchsia-500/10 blur-3xl" />
            
            {/* Bottom left - purple */}
            <div className="absolute bottom-[-150px] left-[-100px] h-[550px] w-[550px] rounded-full bg-purple-500/18 blur-3xl" />
            
            {/* Bottom right - cyan */}
            <div className="absolute bottom-[-100px] right-[-80px] h-[500px] w-[500px] rounded-full bg-cyan-400/16 blur-3xl" />
            
            {/* Bottom center - fuchsia */}
            <div className="absolute bottom-[-200px] left-1/2 h-[450px] w-[450px] -translate-x-1/2 rounded-full bg-fuchsia-500/14 blur-3xl" />

            {/* Gentle vignette for depth */}
            <div className="absolute inset-0 [background:radial-gradient(ellipse_at_center,rgba(0,0,0,0)_0%,rgba(0,0,0,0.18)_65%,rgba(0,0,0,0.4)_100%)]" />
          </div>

          <SiteHeader />
          <div className="flex-1">{children}</div>
          <SiteFooter />
          <MobileBottomNav />
        </ThemeProvider>
      </body>
    </html>
  );
}