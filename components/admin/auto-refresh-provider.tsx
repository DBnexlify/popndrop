// =============================================================================
// AUTO REFRESH PROVIDER
// components/admin/auto-refresh-provider.tsx
// Invisible component that auto-refreshes when PWA resumes
// =============================================================================

'use client';

import { useAutoRefresh } from '@/lib/use-auto-refresh';

/**
 * Invisible component that automatically refreshes dashboard data
 * when the PWA/tab becomes active after being in the background.
 * 
 * How it works:
 * - Listens for visibilitychange, focus, online, and pageshow events
 * - When app resumes, calls router.refresh() to re-fetch all Server Component data
 * - Throttled to prevent spam (default: 30 seconds between refreshes)
 * 
 * This ensures the admin always sees fresh data after:
 * - Switching back to the app from another app
 * - Waking up their phone
 * - Coming back online after being offline
 * - Using browser back/forward navigation
 */
export function AutoRefreshProvider() {
  useAutoRefresh({
    minSeconds: 30,  // Don't refresh more than once every 30 seconds
    debug: process.env.NODE_ENV === 'development',
  });

  // This component renders nothing - it just sets up the listeners
  return null;
}
