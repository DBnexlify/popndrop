// =============================================================================
// ADMIN MOBILE BOTTOM NAVIGATION
// components/admin/admin-mobile-nav.tsx
// =============================================================================

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  CalendarCheck,
  Users,
  CalendarOff,
  Menu,
} from 'lucide-react';

const navItems = [
  { href: '/admin', label: 'Home', icon: LayoutDashboard },
  { href: '/admin/bookings', label: 'Bookings', icon: CalendarCheck },
  { href: '/admin/customers', label: 'Customers', icon: Users },
  { href: '/admin/blackout-dates', label: 'Blackout', icon: CalendarOff },
  { href: '/admin/menu', label: 'More', icon: Menu },
];

export function AdminMobileNav() {
  const pathname = usePathname();
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-neutral-950/95 backdrop-blur-xl lg:hidden">
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
                'flex flex-col items-center justify-center gap-1 text-xs transition-colors',
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
      </div>
      
      {/* Safe area for home indicator */}
      <div className="h-safe-area-inset-bottom bg-neutral-950" />
    </nav>
  );
}
