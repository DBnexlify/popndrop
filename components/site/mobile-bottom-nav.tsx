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
    // Use requestAnimationFrame for smooth, non-blocking updates
    if (!ticking.current) {
      requestAnimationFrame(updateNavState);
      ticking.current = true;
    }
  }, [updateNavState]);

  useEffect(() => {
    // Set initial state
    lastScrollY.current = window.scrollY;
    
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  return (
    <nav 
      ref={navRef}
      data-collapsed="false"
      aria-label="Mobile navigation"
      className="group/nav fixed bottom-0 left-0 right-0 z-50 sm:hidden"
    >
      {/* pb-safe ensures proper padding above Apple's home indicator */}
      <div className="mx-auto max-w-5xl px-3 pb-3 pb-safe">
        <div
          className={cn(
            "rounded-2xl border bg-background/70 backdrop-blur-xl",
            // GPU-accelerated transitions
            "transition-transform duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]",
            "will-change-transform"
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
                    // Collapsed state: tighter padding
                    "group-data-[collapsed=true]/nav:py-1.5",
                    isActive 
                      ? "bg-muted/70" 
                      : "active:bg-muted/40"
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
                      // Collapsed: scale to 0 height, fade out
                      "group-data-[collapsed=true]/nav:mt-0",
                      "group-data-[collapsed=true]/nav:h-0",
                      "group-data-[collapsed=true]/nav:opacity-0",
                      "group-data-[collapsed=true]/nav:scale-y-0",
                      isActive ? "font-medium opacity-100" : "font-normal opacity-70"
                    )}
                  >
                    {label}
                  </span>
                  {/* Screen reader always gets the label */}
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
