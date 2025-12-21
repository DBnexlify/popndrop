// =============================================================================
// SCROLL TO TOP - Client Component
// components/scroll-to-top.tsx
// Ensures all page navigations start at the top of the page
// =============================================================================

"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    // Scroll to top whenever the pathname changes
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
