// =============================================================================
// ADMIN DASHBOARD LAYOUT (Protected)
// app/admin/(dashboard)/layout.tsx
// =============================================================================

import { redirect } from 'next/navigation';
import { getAdminUser } from '@/lib/supabase';
import { AdminNav } from '@/components/admin/admin-nav';
import { AdminMobileNav } from '@/components/admin/admin-mobile-nav';
import { PWAProvider, PWAInstallPrompt, OfflineIndicator } from '@/components/admin/pwa-provider';
import type { Metadata, Viewport } from 'next';

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
      <div className="min-h-screen bg-neutral-950">
        {/* Offline indicator */}
        <OfflineIndicator />
        
        {/* Desktop sidebar */}
        <AdminNav admin={admin} />
        
        {/* Main content */}
        <div className="lg:pl-64">
          {/* Top bar for mobile */}
          <div className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-white/10 bg-neutral-950/80 px-4 backdrop-blur-xl lg:hidden">
            <span className="bg-gradient-to-r from-fuchsia-400 via-purple-400 to-cyan-400 bg-clip-text text-sm font-semibold text-transparent">
              Pop & Drop Admin
            </span>
          </div>
          
          {/* Page content */}
          <main className="min-h-[calc(100vh-3.5rem)] pb-20 lg:min-h-screen lg:pb-0">
            {children}
          </main>
        </div>
        
        {/* Mobile bottom nav */}
        <AdminMobileNav />
        
        {/* PWA install prompt */}
        <PWAInstallPrompt />
      </div>
    </PWAProvider>
  );
}
