// =============================================================================
// ADMIN MOBILE BOTTOM NAVIGATION
// components/admin/admin-mobile-nav.tsx
// Liquid glass design matching the main site mobile nav
// =============================================================================

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  CalendarCheck,
  CalendarDays,
  Users,
  CalendarOff,
  Menu,
  X,
  Package,
  Settings,
  ExternalLink,
  LogOut,
  Ban,
} from 'lucide-react';
import { NotificationToggle, SoundToggle } from './pwa-provider';

const navItems = [
  { href: '/admin', label: 'Home', icon: LayoutDashboard },
  { href: '/admin/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/admin/bookings', label: 'Bookings', icon: CalendarCheck },
  { href: '/admin/customers', label: 'Customers', icon: Users },
];

const menuItems = [
  { href: '/admin/blackout-dates', label: 'Blackout Dates', icon: CalendarOff },
  { href: '/admin/cancellations', label: 'Cancellations', icon: Ban },
  { href: '/admin/inventory', label: 'Inventory', icon: Package },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

// Scroll threshold before collapse triggers
const SCROLL_THRESHOLD = 60;
// Minimum scroll delta to trigger state change (prevents jitter)
const SCROLL_DELTA_MIN = 8;

export function AdminMobileNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
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
    <>
      {/* Bottom Navigation Bar - Liquid Glass Design */}
      <nav 
        ref={navRef}
        data-collapsed="false"
        className="group/nav fixed bottom-0 left-0 right-0 z-50 lg:hidden"
      >
        <div className="mx-auto max-w-5xl px-3 pb-3">
          <div
            className={cn(
              // Liquid glass effect
              "rounded-2xl border border-white/10 bg-background/70 backdrop-blur-xl",
              // GPU-accelerated transitions
              "transition-transform duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]",
              "will-change-transform"
            )}
          >
            <div className="grid grid-cols-5 px-1.5 py-1.5">
              {navItems.map((item) => {
                const isActive = item.href === '/admin' 
                  ? pathname === '/admin'
                  : pathname.startsWith(item.href);
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "relative flex flex-col items-center justify-center rounded-xl",
                      "px-1 py-2 transition-all duration-300 ease-out",
                      // Collapsed state: tighter padding
                      "group-data-[collapsed=true]/nav:py-1.5",
                      isActive 
                        ? "bg-white/10" 
                        : "active:bg-white/5"
                    )}
                  >
                    <item.icon 
                      className={cn(
                        "h-5 w-5 transition-opacity duration-200",
                        isActive ? "text-cyan-400 opacity-100" : "opacity-60"
                      )}
                      strokeWidth={isActive ? 2.25 : 2}
                    />
                    <span 
                      className={cn(
                        "mt-1 text-[10px] leading-none",
                        "transition-all duration-300 ease-out origin-top",
                        // Collapsed: scale to 0 height, fade out
                        "group-data-[collapsed=true]/nav:mt-0",
                        "group-data-[collapsed=true]/nav:h-0",
                        "group-data-[collapsed=true]/nav:opacity-0",
                        "group-data-[collapsed=true]/nav:scale-y-0",
                        isActive ? "font-medium text-cyan-400" : "font-normal opacity-60"
                      )}
                    >
                      {item.label}
                    </span>
                  </Link>
                );
              })}
              
              {/* More button */}
              <button
                onClick={() => setMenuOpen(true)}
                className={cn(
                  "relative flex flex-col items-center justify-center rounded-xl",
                  "px-1 py-2 transition-all duration-300 ease-out",
                  "group-data-[collapsed=true]/nav:py-1.5",
                  menuOpen ? "bg-white/10" : "active:bg-white/5"
                )}
              >
                <Menu 
                  className={cn(
                    "h-5 w-5 transition-opacity duration-200",
                    menuOpen ? "text-cyan-400 opacity-100" : "opacity-60"
                  )}
                  strokeWidth={menuOpen ? 2.25 : 2}
                />
                <span 
                  className={cn(
                    "mt-1 text-[10px] leading-none",
                    "transition-all duration-300 ease-out origin-top",
                    "group-data-[collapsed=true]/nav:mt-0",
                    "group-data-[collapsed=true]/nav:h-0",
                    "group-data-[collapsed=true]/nav:opacity-0",
                    "group-data-[collapsed=true]/nav:scale-y-0",
                    menuOpen ? "font-medium text-cyan-400" : "font-normal opacity-60"
                  )}
                >
                  More
                </span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* More Menu Overlay */}
      {menuOpen && (
        <div 
          className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMenuOpen(false)}
        >
          <div 
            className="absolute bottom-0 left-0 right-0 rounded-t-3xl border-t border-white/10 bg-neutral-900/95 backdrop-blur-xl p-6 animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle bar */}
            <div className="mx-auto mb-6 h-1 w-12 rounded-full bg-white/20" />
            
            {/* Close button */}
            <button
              onClick={() => setMenuOpen(false)}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </button>
            
            {/* Menu title */}
            <h3 className="mb-4 text-lg font-semibold">Menu</h3>
            
            {/* Notification toggle */}
            <div className="mb-2">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-foreground/50">
                Notifications
              </p>
              <NotificationToggle />
            </div>
            
            {/* Sound toggle */}
            <div className="mb-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-foreground/50">
                Sounds
              </p>
              <SoundToggle />
            </div>
            
            {/* Menu links */}
            <div className="mb-4 space-y-1">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-foreground/50">
                Navigation
              </p>
              {menuItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-3 transition-colors',
                      isActive
                        ? 'bg-white/10 text-white'
                        : 'text-foreground/70 hover:bg-white/5'
                    )}
                  >
                    <item.icon className={cn('h-5 w-5', isActive && 'text-cyan-400')} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
            
            {/* External links */}
            <div className="space-y-1 border-t border-white/10 pt-4">
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg px-3 py-3 text-foreground/70 transition-colors hover:bg-white/5"
              >
                <ExternalLink className="h-5 w-5" />
                View Live Site
              </a>
              
              <form action="/api/auth/logout" method="POST">
                <button
                  type="submit"
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-red-400 transition-colors hover:bg-red-500/10"
                >
                  <LogOut className="h-5 w-5" />
                  Sign Out
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
