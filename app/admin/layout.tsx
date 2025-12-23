// =============================================================================
// ADMIN ROOT LAYOUT (Minimal - No Auth)
// app/admin/layout.tsx
// =============================================================================

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin | Pop and Drop Party Rentals',
  robots: 'noindex, nofollow',
  
  // Apple touch icons - defined here AND in dashboard layout for coverage
  icons: {
    icon: '/admin/icon-192.png',
    apple: [
      { url: '/admin/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  
  // Apple PWA settings
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'P&D Admin',
  },
};

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-neutral-950">
      {/* Background gradient - OPTIMIZED FOR SAFARI
          Reduced blur from 100px to 48px (blur-3xl) for smooth performance */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-neutral-950" />
        <div className="absolute -top-40 left-1/2 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-fuchsia-600 opacity-[0.06] blur-3xl" />
        <div className="absolute top-[50%] right-[-80px] h-[500px] w-[350px] rounded-full bg-cyan-500 opacity-[0.04] blur-3xl" />
      </div>
      {children}
    </div>
  );
}