// =============================================================================
// ADMIN MOBILE BOTTOM NAVIGATION
// components/admin/admin-mobile-nav.tsx
// =============================================================================

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  CalendarCheck,
  Users,
  CalendarOff,
  Menu,
  X,
  Package,
  Settings,
  ExternalLink,
  LogOut,
  Bell,
} from 'lucide-react';
import { NotificationToggle } from './pwa-provider';

const navItems = [
  { href: '/admin', label: 'Home', icon: LayoutDashboard },
  { href: '/admin/bookings', label: 'Bookings', icon: CalendarCheck },
  { href: '/admin/customers', label: 'Customers', icon: Users },
  { href: '/admin/blackout-dates', label: 'Blackout', icon: CalendarOff },
];

const menuItems = [
  { href: '/admin/inventory', label: 'Inventory', icon: Package },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export function AdminMobileNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  
  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
        {/* Glassmorphism floating bar */}
        <div className="mx-3 mb-3 rounded-2xl border border-white/10 bg-neutral-900/90 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          <div className="grid h-16 grid-cols-5">
            {navItems.map((item) => {
              const isActive = item.href === '/admin' 
                ? pathname === '/admin'
                : pathname.startsWith(item.href);
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1 transition-colors',
                    isActive
                      ? 'text-cyan-400'
                      : 'text-foreground/50'
                  )}
                >
                  <item.icon className={cn(
                    'h-5 w-5',
                    isActive && 'text-cyan-400'
                  )} />
                  <span className={cn(
                    'text-[10px]',
                    isActive ? 'font-medium' : 'font-normal'
                  )}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
            
            {/* More button */}
            <button
              onClick={() => setMenuOpen(true)}
              className={cn(
                'flex flex-col items-center justify-center gap-1 transition-colors',
                menuOpen ? 'text-cyan-400' : 'text-foreground/50'
              )}
            >
              <Menu className="h-5 w-5" />
              <span className="text-[10px]">More</span>
            </button>
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
            className="absolute bottom-0 left-0 right-0 rounded-t-3xl border-t border-white/10 bg-neutral-900 p-6 animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle bar */}
            <div className="mx-auto mb-6 h-1 w-12 rounded-full bg-white/20" />
            
            {/* Close button */}
            <button
              onClick={() => setMenuOpen(false)}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10"
            >
              <X className="h-4 w-4" />
            </button>
            
            {/* Menu title */}
            <h3 className="mb-4 text-lg font-semibold">Menu</h3>
            
            {/* Notification toggle */}
            <div className="mb-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-foreground/50">
                Notifications
              </p>
              <NotificationToggle />
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
                    <item.icon className="h-5 w-5" />
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
