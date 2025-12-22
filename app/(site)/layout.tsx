// =============================================================================
// SITE LAYOUT (Public Pages)
// app/(site)/layout.tsx
// Includes header, footer, and mobile navigation for public-facing pages
// =============================================================================

import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { MobileBottomNav } from "@/components/site/mobile-bottom-nav";
import { ScrollToTop } from "@/components/scroll-to-top";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ScrollToTop />
      <SiteHeader />
      <main id="main-content" className="flex-1" tabIndex={-1}>
        {children}
      </main>
      <SiteFooter />
      <MobileBottomNav />
    </>
  );
}
