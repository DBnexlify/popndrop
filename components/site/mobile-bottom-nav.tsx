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
 * Pure floating pill navigation - NO background banner.
 * 
 * Cross-platform architecture:
 * - iOS: Uses env(safe-area-inset-bottom) for home indicator
 * - Android gesture nav: Falls back to minimum padding
 * - Android button nav: Falls back to minimum padding
 * 
 * The floating pill sits above the safe area with proper spacing.
 * NO full-width background layer - just the floating card.
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
      className="group/nav fixed z-50 sm:hidden"
      style={{
        /*
         * CROSS-PLATFORM POSITIONING:
         * 
         * Use explicit left/right/bottom positioning instead of inset-x-0
         * to ensure consistent behavior across iOS and Android.
         * 
         * The nav is positioned as a floating element with pointer-events
         * only on the actual pill (not the full width).
         */
        left: 0,
        right: 0,
        bottom: 0,
        // GPU acceleration prevents Android scroll jank
        transform: 'translateZ(0)',
        WebkitTransform: 'translateZ(0)',
        // Disable pointer events on container (only pill is interactive)
        pointerEvents: 'none',
      }}
    >
      {/* 
        FLOATING PILL CONTAINER
        =======================
        Pure floating pill - NO background banner.
        Uses additive safe area: base padding + any safe area inset.
        This ensures minimum spacing on all platforms.
      */}
      <div 
        className="mx-auto w-full max-w-5xl px-3"
        style={{
          /*
           * CROSS-PLATFORM SAFE AREA:
           * Uses ADDITIVE approach: 12px base + safe area inset
           * - iOS: 12px + ~34px = 46px (proper home indicator clearance)
           * - Android gesture: 12px + 0-24px = 12-36px
           * - Android buttons: 12px + 0 = 12px (minimum always applies)
           * 
           * IMPORTANT: Do NOT use max() - it behaves inconsistently on Android.
           */
          paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
          // Re-enable pointer events on the actual content
          pointerEvents: 'auto',
        }}
      >
        {/* The floating pill itself */}
        <div
          className={cn(
            // Glassmorphism styling
            "rounded-2xl border bg-background/70 backdrop-blur-xl",
            // Subtle shadow for floating effect
            "shadow-[0_4px_24px_rgba(0,0,0,0.35)]",
            // Smooth collapse animation
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
    </nav>
  );
}
