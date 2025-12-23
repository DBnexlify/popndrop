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
          {/* Skip link for keyboard/screen reader users */}
          <SkipLink />
          
          {/* Site-wide background gradient - OPTIMIZED FOR SAFARI
              Using smaller blur values and fewer elements for better performance.
              Safari struggles with large blur-[100px] operations. */}
          <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden="true">
            {/* Base dark */}
            <div className="absolute inset-0 bg-neutral-950" />

            {/* Optimized gradient blobs - reduced blur for Safari performance
                Original: blur-[100px] on 5 elements = very slow on Safari
                Optimized: blur-3xl (48px) on 3 elements = smooth on all browsers */}
            <div className="absolute -top-40 left-1/2 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-fuchsia-600 opacity-[0.07] blur-3xl" />
            <div className="absolute top-[40%] left-[-100px] h-[400px] w-[400px] rounded-full bg-purple-600 opacity-[0.05] blur-3xl" />
            <div className="absolute top-[60%] right-[-80px] h-[500px] w-[350px] rounded-full bg-cyan-500 opacity-[0.04] blur-3xl" />
          </div>

          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
