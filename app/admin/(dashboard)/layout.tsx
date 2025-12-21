// =============================================================================
// ADMIN DASHBOARD LAYOUT (Protected)
// app/admin/(dashboard)/layout.tsx
// =============================================================================

import { redirect } from 'next/navigation';
import { getAdminUser } from '@/lib/supabase';
import { AdminNav } from '@/components/admin/admin-nav';
import { AdminMobileNav } from '@/components/admin/admin-mobile-nav';
import { PWAProvider, PWAInstallPrompt, OfflineIndicator } from '@/components/admin/pwa-provider';
import { NewBookingListener } from '@/components/admin/new-booking-listener';
import { ScrollToTop } from '@/components/scroll-to-top';
import type { Metadata, Viewport } from 'next';
import Image from 'next/image';

// =============================================================================
// PWA METADATA
// =============================================================================

export const metadata: Metadata = {
  title: 'Pop & Drop Admin',
  description: 'Manage your bounce house rental business',
  manifest: '/admin/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'P&D Admin',
  },
  formatDetection: {
    telephone: true,
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  themeColor: '#d946ef',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

// =============================================================================
// LAYOUT COMPONENT
// =============================================================================

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getAdminUser();
  
  if (!admin) {
    redirect('/admin/login');
  }
  
  return (
    <PWAProvider>
      <ScrollToTop />
      <div className="min-h-screen bg-neutral-950">
        {/* Offline indicator */}
        <OfflineIndicator />
        
        {/* Desktop sidebar */}
        <AdminNav admin={admin} />
        
        {/* Main content */}
        <div className="lg:pl-64">
          {/* Mobile header */}
          <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-white/10 bg-neutral-950/80 px-4 backdrop-blur-xl lg:hidden">
            <div className="flex items-center gap-2">
              <Image
                src="/brand/logo.png"
                alt="Pop & Drop"
                width={32}
                height={32}
                className="h-8 w-8 object-contain"
              />
              <div className="flex flex-col">
                <span className="bg-gradient-to-r from-fuchsia-400 via-purple-400 to-cyan-400 bg-clip-text text-sm font-bold text-transparent">
                  Pop & Drop
                </span>
                <span className="text-[10px] font-medium text-foreground/50">
                  Admin Dashboard
                </span>
              </div>
            </div>
            
            {/* Admin badge */}
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-gradient-to-r from-fuchsia-500/20 to-purple-500/20 px-2.5 py-1 text-[10px] font-semibold text-fuchsia-300">
                ADMIN
              </span>
            </div>
          </header>
          
          {/* Page content */}
          <main className="min-h-[calc(100vh-3.5rem)] pb-24 lg:min-h-screen lg:pb-0">
            {children}
          </main>
        </div>
        
        {/* Mobile bottom nav */}
        <AdminMobileNav />
        
        {/* PWA install prompt */}
        <PWAInstallPrompt />
        
        {/* New booking sound notification */}
        <NewBookingListener />
      </div>
    </PWAProvider>
  );
}
