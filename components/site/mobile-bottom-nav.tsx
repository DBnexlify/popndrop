"use client";

import { useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, PartyPopper, CalendarCheck, Phone } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Home", Icon: Home },
  { href: "/rentals", label: "Rentals", Icon: PartyPopper },
  { href: "/bookings", label: "Book", Icon: CalendarCheck },
  { href: "/contact", label: "Contact", Icon: Phone },
] as const;

// Scroll threshold before collapse triggers
const SCROLL_THRESHOLD = 60;
// Minimum scroll delta to trigger state change (prevents jitter)
const SCROLL_DELTA_MIN = 8;

/**
 * MOBILE BOTTOM NAVIGATION
 * ========================
 * Cross-platform fixed bottom navigation that handles:
 * - iOS home indicator (via safe-area-inset-bottom)
 * - Android gesture navigation (Chrome 135+ edge-to-edge)
 * - Android button navigation (no safe area needed)
 * - Dynamic collapse on scroll for more content visibility
 * 
 * ARCHITECTURE:
 * - Uses position: fixed with bottom: 0
 * - Content area has fixed height (NAV_HEIGHT)
 * - Safe area handled by extending background INTO the safe area
 * - This follows Chrome's recommended pattern to avoid layout thrashing
 * 
 * @see https://developer.chrome.com/docs/css-ui/edge-to-edge
 */
export function MobileBottomNav() {
  const pathname = usePathname();
  const navRef = useRef<HTMLDivElement>(null);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  const updateNavState = useCallback(() => {
    const currentScrollY = window.scrollY;
    const delta = currentScrollY - lastScrollY.current;
    const nav = navRef.current;

    if (!nav || Math.abs(delta) < SCROLL_DELTA_MIN) {
      ticking.current = false;
      return;
    }

    const shouldCollapse = delta > 0 && currentScrollY > SCROLL_THRESHOLD;
    const shouldExpand = delta < 0 || currentScrollY <= SCROLL_THRESHOLD;

    if (shouldCollapse) {
      nav.dataset.collapsed = "true";
    } else if (shouldExpand) {
      nav.dataset.collapsed = "false";
    }

    lastScrollY.current = currentScrollY;
    ticking.current = false;
  }, []);

  const handleScroll = useCallback(() => {
    if (!ticking.current) {
      requestAnimationFrame(updateNavState);
      ticking.current = true;
    }
  }, [updateNavState]);

  useEffect(() => {
    lastScrollY.current = window.scrollY;
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  return (
    <nav
      ref={navRef}
      data-collapsed="false"
      aria-label="Mobile navigation"
      className="group/nav fixed inset-x-0 bottom-0 z-50 sm:hidden"
      style={{
        /*
         * CROSS-PLATFORM SAFE AREA STRATEGY:
         * 
         * We position the nav at bottom: 0, then use padding-bottom to push
         * the CONTENT up above the safe area. The nav's background extends
         * into the safe area, creating a seamless edge-to-edge appearance.
         * 
         * This follows Chrome's edge-to-edge guidelines:
         * - iOS: Gets ~34px safe area for home indicator
         * - Android gesture nav: Gets 0-24px depending on device
         * - Android button nav: Gets 0px (buttons are outside viewport)
         * 
         * The GPU acceleration hints prevent jank on Android during scroll.
         */
        transform: 'translateZ(0)',
        WebkitTransform: 'translateZ(0)',
        willChange: 'transform',
      }}
    >
      {/* 
        BACKGROUND LAYER
        Extends into safe area for seamless edge-to-edge appearance.
        Uses same glassmorphism as the content but covers full nav height + safe area.
      */}
      <div 
        className="absolute inset-0 border-t border-white/5 bg-background/80 backdrop-blur-xl"
        style={{
          // Extend background down into safe area
          bottom: 'calc(-1 * env(safe-area-inset-bottom, 0px))',
          height: 'calc(100% + env(safe-area-inset-bottom, 0px))',
        }}
        aria-hidden="true"
      />

      {/* 
        CONTENT CONTAINER
        This is the actual nav content area. It sits ABOVE the safe area.
        The px-3 provides horizontal margins, and the inner card provides the visual container.
      */}
      <div className="relative mx-auto max-w-5xl px-3 pb-3 pt-2">
        <div
          className={cn(
            "rounded-2xl border bg-background/70 backdrop-blur-xl",
            "transition-transform duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]",
            "border-white/10"
          )}
        >
          <div className="grid grid-cols-4 px-1.5 py-1.5" role="menubar">
            {NAV_ITEMS.map(({ href, label, Icon }) => {
              const isActive = pathname === href;

              return (
                <Link
                  key={href}
                  href={href}
                  role="menuitem"
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "relative flex flex-col items-center justify-center rounded-xl",
                    "px-1 py-2 transition-all duration-300 ease-out",
                    "group-data-[collapsed=true]/nav:py-1.5",
                    isActive ? "bg-muted/70" : "active:bg-muted/40"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 transition-opacity duration-200",
                      isActive ? "opacity-100" : "opacity-70"
                    )}
                    strokeWidth={isActive ? 2.25 : 2}
                    aria-hidden="true"
                  />
                  <span
                    className={cn(
                      "mt-1 text-[11px] leading-none",
                      "transition-all duration-300 ease-out origin-top",
                      "group-data-[collapsed=true]/nav:mt-0",
                      "group-data-[collapsed=true]/nav:h-0",
                      "group-data-[collapsed=true]/nav:opacity-0",
                      "group-data-[collapsed=true]/nav:scale-y-0",
                      isActive ? "font-medium opacity-100" : "font-normal opacity-70"
                    )}
                  >
                    {label}
                  </span>
                  <span className="sr-only">{label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* 
        SAFE AREA SPACER
        This invisible element creates space for the safe area (home indicator, gesture bar).
        It ensures the nav visually "sits above" the safe area on all devices.
      */}
      <div 
        className="pointer-events-none"
        style={{
          height: 'env(safe-area-inset-bottom, 0px)',
        }}
        aria-hidden="true"
      />
    </nav>
  );
}
