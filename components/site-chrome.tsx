"use client";

import { usePathname } from "next/navigation";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { MobileBottomNav } from "@/components/site/mobile-bottom-nav";

interface SiteChromeProps {
  children: React.ReactNode;
}

/**
 * Wrapper component that shows site header/footer/mobile nav
 * on public pages but hides them on admin routes.
 * Admin pages have their own navigation.
 */
export function SiteChrome({ children }: SiteChromeProps) {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith("/admin");

  return (
    <>
      {!isAdminRoute && <SiteHeader />}
      <div className="flex-1">{children}</div>
      {!isAdminRoute && <SiteFooter />}
      {!isAdminRoute && <MobileBottomNav />}
    </>
  );
}