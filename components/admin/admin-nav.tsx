// =============================================================================
// ADMIN SIDEBAR NAVIGATION
// components/admin/admin-nav.tsx
// =============================================================================

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  CalendarCheck,
  CalendarDays,
  Users,
  Package,
  CalendarOff,
  Settings,
  LogOut,
  ExternalLink,
  Ban,
  Tag,
  Gift,
  DollarSign,
} from 'lucide-react';
import type { AdminUser } from '@/lib/database-types';
import { NotificationToggle, SoundToggle } from './pwa-provider';
import { NotificationBell } from './notification-bell';

interface AdminNavProps {
  admin: AdminUser;
}

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/admin/bookings', label: 'Bookings', icon: CalendarCheck },
  { href: '/admin/cancellations', label: 'Cancellations', icon: Ban },
  { href: '/admin/financials', label: 'Financials', icon: DollarSign },
  { href: '/admin/customers', label: 'Customers', icon: Users },
  { href: '/admin/inventory', label: 'Inventory', icon: Package },
  { href: '/admin/promo-codes', label: 'Promo Codes', icon: Tag },
  { href: '/admin/loyalty', label: 'Loyalty Rewards', icon: Gift },
  { href: '/admin/blackout-dates', label: 'Blackout Dates', icon: CalendarOff },
];

const bottomNavItems = [
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export function AdminNav({ admin }: AdminNavProps) {
  const pathname = usePathname();
  
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-white/10 bg-neutral-950 lg:flex overflow-visible">
      {/* Logo & Notifications */}
      <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
        <div className="flex items-center gap-2">
          <span className="bg-gradient-to-r from-fuchsia-400 via-purple-400 to-cyan-400 bg-clip-text text-lg font-semibold text-transparent">
            Pop & Drop
          </span>
          <span className="rounded bg-fuchsia-500/20 px-1.5 py-0.5 text-[10px] font-medium text-fuchsia-300">
            ADMIN
          </span>
        </div>
        {/* Bell with extra padding to prevent cutoff */}
        <div className="relative -mr-1">
          <NotificationBell />
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const isActive = item.href === '/admin' 
            ? pathname === '/admin'
            : pathname.startsWith(item.href);
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                isActive
                  ? 'bg-white/10 text-white'
                  : 'text-foreground/60 hover:bg-white/5 hover:text-foreground'
              )}
            >
              <item.icon className={cn(
                'h-5 w-5',
                isActive ? 'text-cyan-400' : ''
              )} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      
      {/* Bottom section */}
      <div className="border-t border-white/10 p-4">
        {/* Notification toggle */}
        <div className="mb-2">
          <NotificationToggle />
        </div>
        
        {/* Sound toggle */}
        <div className="mb-3">
          <SoundToggle />
        </div>
        
        {/* View site link */}
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground/60 transition-all hover:bg-white/5 hover:text-foreground"
        >
          <ExternalLink className="h-5 w-5" />
          View Site
        </a>
        
        {/* Settings */}
        {bottomNavItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                isActive
                  ? 'bg-white/10 text-white'
                  : 'text-foreground/60 hover:bg-white/5 hover:text-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
        
        {/* User info & logout */}
        <div className="mt-4 rounded-lg border border-white/5 bg-white/[0.02] p-3">
          <p className="text-sm font-medium text-foreground/90">
            {admin.full_name || admin.email}
          </p>
          <p className="text-xs text-foreground/50">{admin.role || 'Admin'}</p>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="mt-2 flex items-center gap-2 text-xs text-foreground/50 transition-colors hover:text-red-400"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
