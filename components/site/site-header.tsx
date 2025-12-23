"use client";

import Link from "next/link";

/**
 * SITE HEADER
 * ===========
 * Cross-platform sticky header that handles:
 * - iOS status bar / notch (via safe-area-inset-top)
 * - Android status bar (via safe area or fallback padding)
 * - Android Chrome's dynamic viewport (URL bar hide/show)
 * - Consistent vertical centering across font rendering differences
 * 
 * ARCHITECTURE:
 * - Uses position: sticky with top: 0
 * - Safe area padding applied to header element itself
 * - Content uses flexbox centering with min-height for resilience
 * - GPU acceleration hints for smooth scroll behavior
 * 
 * ANDROID BROWSER CHROME BEHAVIOR:
 * When scrolling on Android Chrome, the URL bar hides, changing the viewport.
 * Position: sticky with top: 0 handles this correctly because the element
 * stays at the top of the viewport regardless of viewport changes.
 * The header background fills the status bar area on both platforms.
 * 
 * @see https://developer.chrome.com/docs/css-ui/edge-to-edge
 */
export function SiteHeader() {
  return (
    <header
      className="sticky top-0 z-50 w-full border-b border-white/5 bg-background/80 backdrop-blur-xl"
      style={{
        /*
         * CROSS-PLATFORM SAFE AREA:
         * 
         * iOS: env(safe-area-inset-top) returns notch height (~44-47px on iPhone X+)
         * Android: env() returns 0 (status bar is handled differently)
         * 
         * On Android, the status bar overlays the viewport when viewport-fit=cover.
         * We handle this by:
         * 1. Using safe area for iOS notch
         * 2. The header's background color extends under the status bar on Android
         * 
         * GPU acceleration prevents sticky jank during scroll.
         */
        paddingTop: 'env(safe-area-inset-top, 0px)',
        transform: 'translateZ(0)',
        WebkitTransform: 'translateZ(0)',
        /*
         * will-change: transform tells the browser to optimize this element
         * for position changes, which helps with sticky behavior on Android
         */
        willChange: 'transform',
      }}
    >
      {/*
        CONTENT CONTAINER
        Uses min-height (not fixed height) for resilient vertical centering.
        This handles font rendering differences between iOS and Android.
        
        The flex container with items-center handles vertical centering.
        The inner content wrapper handles horizontal centering on mobile.
      */}
      <div className="mx-auto flex min-h-14 max-w-5xl items-center justify-center px-4 sm:min-h-16 sm:px-6">
        {/* Mobile: Centered brand */}
        <div className="flex h-full w-full items-center justify-center sm:hidden">
          <Link
            href="/"
            className="flex items-center transition-opacity hover:opacity-80"
            aria-label="Pop and Drop Party Rentals - Home"
          >
            {/*
              Typography note:
              - leading-none removes line-height contribution to vertical alignment
              - tracking-tight tightens letter spacing for brand aesthetic
              - bg-clip-text enables gradient text effect
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
