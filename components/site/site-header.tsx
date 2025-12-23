"use client";

import Link from "next/link";

export function SiteHeader() {
  return (
    <header 
      className="sticky top-0 z-50 w-full border-b border-white/5 bg-background/80 backdrop-blur-xl"
      // Safe area handling for devices with status bar overlays
      style={{
        // Ensure header accounts for any top safe area (iOS notch, Android status bar)
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}
    >
      {/* 
        CROSS-PLATFORM VERTICAL CENTERING FIX:
        Using explicit min-height instead of just h-14 ensures consistent behavior.
        The flexbox centering is the same, but min-height is more resilient.
      */}
      <div className="mx-auto flex min-h-14 max-w-5xl items-center justify-center px-4 sm:min-h-16 sm:px-6">
        {/* Mobile: Centered brand with explicit vertical alignment */}
        <div className="flex h-full w-full items-center justify-center sm:hidden">
          <Link 
            href="/" 
            className="flex items-center transition-opacity hover:opacity-80"
            aria-label="Pop and Drop Party Rentals - Home"
          >
            {/* 
              Using leading-none and explicit line-height ensures text is
              visually centered regardless of platform font rendering differences
            */}
            <span className="bg-gradient-to-r from-fuchsia-400 via-purple-400 to-cyan-400 bg-clip-text text-base font-semibold leading-none tracking-tight text-transparent">
              Pop and Drop Party Rentals
            </span>
          </Link>
        </div>

        {/* Desktop: Left brand + Right nav */}
        <div className="hidden w-full items-center justify-between sm:flex">
          <Link 
            href="/" 
            className="flex items-center transition-opacity hover:opacity-80"
            aria-label="Pop and Drop Party Rentals - Home"
          >
            <span className="bg-gradient-to-r from-fuchsia-400 via-purple-400 to-cyan-400 bg-clip-text text-lg font-semibold leading-none tracking-tight text-transparent">
              Pop and Drop Party Rentals
            </span>
          </Link>

          <nav aria-label="Main navigation" className="flex items-center gap-1">
            <Link
              href="/"
              className="rounded-lg px-3 py-2 text-sm text-foreground/70 transition-colors hover:bg-white/5 hover:text-foreground"
            >
              Home
            </Link>
            <Link
              href="/rentals"
              className="rounded-lg px-3 py-2 text-sm text-foreground/70 transition-colors hover:bg-white/5 hover:text-foreground"
            >
              Rentals
            </Link>
            <Link
              href="/contact"
              className="rounded-lg px-3 py-2 text-sm text-foreground/70 transition-colors hover:bg-white/5 hover:text-foreground"
            >
              Contact
            </Link>
            <Link
              href="/my-bookings"
              className="rounded-lg px-3 py-2 text-sm text-foreground/70 transition-colors hover:bg-white/5 hover:text-foreground"
            >
              My Bookings
            </Link>
            <Link
              href="/bookings"
              className="ml-2 rounded-lg bg-gradient-to-r from-fuchsia-500 to-purple-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-fuchsia-500/20 transition-all hover:shadow-xl hover:shadow-fuchsia-500/30"
            >
              Book Now
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
