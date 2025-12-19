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
    <html lang="en" suppressHydrationWarning style={{ backgroundColor: '#1a1a1a' }}>
      <body className={`${geistSans.variable} ${geistMono.variable} flex min-h-screen flex-col antialiased`}>
        <ThemeProvider>
          {/* Site-wide background gradient */}
          <div className="pointer-events-none fixed inset-0 -z-10">
            {/* Base dark */}
            <div className="absolute inset-0 bg-neutral-950" />

            {/* Gradient blobs */}
            <div className="absolute -top-40 left-1/2 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-fuchsia-600 opacity-[0.08] blur-[100px]" />
            <div className="absolute -top-20 right-[-150px] h-[200px] w-[400px] rounded-full bg-cyan-500 opacity-[0.06] blur-[100px]" />
            <div className="absolute top-[35%] left-[-180px] h-[500px] w-[500px] rounded-full bg-purple-600 opacity-[0.06] blur-[100px]" />
            <div className="absolute top-[50%] right-[-120px] h-[800px] w-[400px] rounded-full bg-cyan-500 opacity-[0.05] blur-[100px]" />
            <div className="absolute bottom-[-150px] left-1/3 h-[500px] w-[600px] rounded-full bg-purple-600 opacity-[0.08] blur-[100px]" />
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