"use client";

import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-5xl items-center px-4 sm:h-16 sm:px-6">
        {/* Mobile: Centered brand */}
        <div className="flex w-full items-center justify-center sm:hidden">
          <Link href="/" className="transition-opacity hover:opacity-80">
            <span className="bg-gradient-to-r from-fuchsia-400 via-purple-400 to-cyan-400 bg-clip-text text-base font-semibold tracking-tight text-transparent">
              Pop and Drop Party Rentals
            </span>
          </Link>
        </div>

        {/* Desktop: Left brand + Right nav */}
        <div className="hidden w-full items-center justify-between sm:flex">
          <Link href="/" className="transition-opacity hover:opacity-80">
            <span className="bg-gradient-to-r from-fuchsia-400 via-purple-400 to-cyan-400 bg-clip-text text-lg font-semibold tracking-tight text-transparent">
              Pop and Drop Party Rentals
            </span>
          </Link>

          <nav className="flex items-center gap-1">
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
              href="/gallery"
              className="rounded-lg px-3 py-2 text-sm text-foreground/70 transition-colors hover:bg-white/5 hover:text-foreground"
            >
              Gallery
            </Link>
            <Link
              href="/about"
              className="rounded-lg px-3 py-2 text-sm text-foreground/70 transition-colors hover:bg-white/5 hover:text-foreground"
            >
              About
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