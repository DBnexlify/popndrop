// =============================================================================
// SITE LAYOUT (Public Pages)
// app/(site)/layout.tsx
// Includes header, footer, and mobile navigation for public-facing pages
// =============================================================================

import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { MobileBottomNav } from "@/components/site/mobile-bottom-nav";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <div className="flex-1">{children}</div>
      <SiteFooter />
      <MobileBottomNav />
    </>
  );
}
