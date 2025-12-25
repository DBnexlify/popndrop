import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SkipLink } from "@/components/ui/skip-link";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

// =============================================================================
// VIEWPORT CONFIGURATION
// viewportFit: 'cover' is REQUIRED for safe area insets to work on iOS
// This allows content to extend to screen edges, then we use CSS
// env(safe-area-inset-*) to add proper padding
// =============================================================================
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover', // Required for safe area insets
  themeColor: '#d946ef', // Fuchsia brand color
};

export const metadata: Metadata = {
  title: "Pop and Drop Party Rentals | Bounce House Rentals in Ocala, FL",
  description: "Bounce house and inflatable party rentals in Ocala, Florida, Marion County, and surrounding areas. Water slides, themed bounce houses, and party inflatables delivered and set up. Book online in minutes!",
  keywords: "bounce house rental Ocala, inflatable rental Ocala FL, water slide rental Marion County, party rentals Ocala Florida, bounce house Ocala, inflatable party rentals, kids party rentals Ocala",
  icons: {
    icon: [
      { url: '/brand/logo.png', type: 'image/png' },
    ],
    apple: [
      { url: '/brand/logo.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    title: "Pop and Drop Party Rentals | Ocala, FL",
    description: "Bounce house and inflatable rentals delivered and set up in Ocala, FL, Marion County, and surrounding areas. Book your party rental online!",
    type: "website",
    locale: "en_US",
    images: ['/brand/logo.png'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning style={{ backgroundColor: '#1a1a1a' }}>
      <body className={`${geistSans.variable} ${geistMono.variable} flex min-h-screen flex-col antialiased`}>
        <ThemeProvider>
          {/* Skip link for keyboard/screen reader users */}
          <SkipLink />
          
          {/* Site-wide background gradient - APPLE PREMIUM STYLE
              Large, flowing gradient layers for smooth color transitions.
              Optimized blur values for Safari performance. */}
          <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden="true">
            {/* Base dark */}
            <div className="absolute inset-0 bg-neutral-950" />

            {/* Flowing gradient layers - large, overlapping for seamless blending */}
            {/* Top flow - fuchsia wash */}
            <div className="absolute -top-[200px] left-0 right-0 h-[800px] bg-gradient-to-b from-fuchsia-600/[0.15] via-fuchsia-500/[0.08] to-transparent" />
            
            {/* Left flow - fuchsia/purple */}
            <div className="absolute top-0 bottom-0 -left-[200px] w-[800px] bg-gradient-to-r from-fuchsia-600/[0.12] via-purple-600/[0.08] to-transparent" />
            
            {/* Right flow - cyan accent */}
            <div className="absolute top-0 bottom-0 -right-[200px] w-[700px] bg-gradient-to-l from-cyan-500/[0.10] via-purple-500/[0.05] to-transparent" />
            
            {/* Bottom flow - purple/cyan blend */}
            <div className="absolute -bottom-[200px] left-0 right-0 h-[700px] bg-gradient-to-t from-purple-600/[0.12] via-cyan-500/[0.06] to-transparent" />
            
            {/* Center glow - subtle fuchsia for depth */}
            <div className="absolute top-1/2 left-1/2 h-[1000px] w-[1200px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-fuchsia-500 opacity-[0.04] blur-3xl" />
          </div>

          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
