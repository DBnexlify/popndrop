"use client";

import { useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, PartyPopper, CalendarCheck, Phone, ClipboardList } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Home", Icon: Home },
  { href: "/rentals", label: "Rentals", Icon: PartyPopper },
  { href: "/bookings", label: "Book", Icon: CalendarCheck },
  { href: "/my-bookings", label: "Bookings", Icon: ClipboardList },
  { href: "/contact", label: "Contact", Icon: Phone },
] as const;

// Scroll threshold before collapse triggers
const SCROLL_THRESHOLD = 60;
// Minimum scroll delta to trigger state change (prevents jitter)
const SCROLL_DELTA_MIN = 8;

/**
 * MOBILE BOTTOM NAVIGATION - ANDROID CHROME FIXED
 * ================================================
 * 
 * CRITICAL FIXES (Dec 2025):
 * 1. Use flexbox centering instead of left/right: 0 + mx-auto (fails on Android)
 * 2. Use bottom: env(safe-area-inset-bottom) for POSITIONING, not just padding
 * 3. NO transform on fixed container (breaks viewport positioning on Android)
 * 4. Explicit width with max-width for reliable centering
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
    <>
      {/*
        FIXED OVERLAY CONTAINER
        =======================
        ANDROID CHROME FIX: Use flexbox for centering instead of left/right: 0 + mx-auto
        The overlay fills the viewport width and uses flexbox to center the pill.
        
        CRITICAL: No transform on this container - it breaks fixed positioning on Android.
      */}
      <nav
        ref={navRef}
        data-collapsed="false"
        aria-label="Mobile navigation"
        className="group/nav fixed z-50 flex justify-center sm:hidden"
        style={{
          // Full width positioning
          left: 0,
          right: 0,
          // ANDROID FIX: Position from safe area, not from bottom: 0
          // This ensures the nav is always visible above gesture bar
          bottom: 'env(safe-area-inset-bottom, 0px)',
          // Add padding so pill doesn't touch edges
          paddingLeft: '12px',
          paddingRight: '12px',
          paddingBottom: '12px',
          // Disable pointer events on container
          pointerEvents: 'none',
        }}
      >
        {/*
          FLOATING PILL
          =============
          Explicit width + max-width ensures consistent sizing.
          GPU acceleration applied here, NOT on fixed container.
        */}
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
          style={{
            // Explicit width for reliable centering
            width: '100%',
            maxWidth: '500px',
            // Re-enable pointer events
            pointerEvents: 'auto',
            // GPU acceleration on pill only (not fixed container)
            transform: 'translateZ(0)',
            WebkitTransform: 'translateZ(0)',
          }}
        >
          <div className="grid grid-cols-5 px-1 py-1.5" role="menubar">
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
                    "px-0.5 py-2 transition-all duration-300 ease-out",
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
                      "mt-1 text-[10px] leading-none",
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
      </nav>
    </>
  );
}
