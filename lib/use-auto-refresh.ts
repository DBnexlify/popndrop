// =============================================================================
// AUTO-REFRESH HOOK FOR PWA
// lib/use-auto-refresh.ts
// Automatically refreshes data when app resumes from background
// =============================================================================

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

type RefreshReason = 
  | 'visibilitychange'  // Tab/app went hidden -> visible
  | 'focus'             // Window gained focus
  | 'online'            // Came back online
  | 'pageshow-bfcache'; // Restored from back/forward cache (Safari)

interface UseAutoRefreshOptions {
  /** Minimum seconds between refreshes (default: 30) */
  minSeconds?: number;
  /** Enable debug logging (default: false) */
  debug?: boolean;
  /** Custom callback instead of router.refresh() */
  onRefresh?: (reason: RefreshReason) => void;
}

/**
 * Automatically refreshes the page when the PWA/tab becomes active again.
 * 
 * Listens for:
 * - visibilitychange: Tab/app goes hidden -> visible (most reliable for PWAs)
 * - focus: Window gains focus
 * - online: Network reconnects after being offline
 * - pageshow: Restored from bfcache (Safari does this a lot)
 * 
 * Uses router.refresh() to re-run all Server Component data fetching
 * without a full page reload.
 * 
 * @example
 * ```tsx
 * // In a client component wrapper
 * function DashboardRefresher() {
 *   useAutoRefresh({ minSeconds: 30, debug: true });
 *   return null;
 * }
 * ```
 */
export function useAutoRefresh(options: UseAutoRefreshOptions = {}) {
  const { minSeconds = 30, debug = false, onRefresh } = options;
  const router = useRouter();
  const lastRefreshRef = useRef<number>(Date.now());

  const log = useCallback((...args: unknown[]) => {
    if (debug) {
      console.log('[AutoRefresh]', ...args);
    }
  }, [debug]);

  const maybeRefresh = useCallback((reason: RefreshReason) => {
    const now = Date.now();
    const elapsedSeconds = (now - lastRefreshRef.current) / 1000;

    // Avoid spamming refreshes if OS fires multiple events
    if (elapsedSeconds < minSeconds) {
      log(`Skipping refresh (${reason}) - only ${elapsedSeconds.toFixed(1)}s since last refresh`);
      return;
    }

    log(`Refreshing due to: ${reason} (${elapsedSeconds.toFixed(1)}s since last refresh)`);
    lastRefreshRef.current = now;

    if (onRefresh) {
      onRefresh(reason);
    } else {
      // Default: use Next.js router.refresh() to re-fetch server data
      router.refresh();
    }
  }, [minSeconds, log, onRefresh, router]);

  useEffect(() => {
    // Handler: tab/app visibility changed
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        maybeRefresh('visibilitychange');
      }
    };

    // Handler: window gained focus
    const onFocus = () => {
      maybeRefresh('focus');
    };

    // Handler: came back online
    const onOnline = () => {
      maybeRefresh('online');
    };

    // Handler: restored from back/forward cache
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        maybeRefresh('pageshow-bfcache');
      }
    };

    log('Setting up auto-refresh listeners');

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onOnline);
    window.addEventListener('pageshow', onPageShow);

    return () => {
      log('Cleaning up auto-refresh listeners');
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [maybeRefresh, log]);
}

/**
 * Hook that returns a manual refresh function alongside auto-refresh.
 * Useful when you also need a "pull to refresh" or manual refresh button.
 */
export function useAutoRefreshWithManual(options: UseAutoRefreshOptions = {}) {
  const router = useRouter();
  const lastRefreshRef = useRef<number>(Date.now());

  // Set up auto refresh
  useAutoRefresh({
    ...options,
    onRefresh: (reason) => {
      lastRefreshRef.current = Date.now();
      if (options.onRefresh) {
        options.onRefresh(reason);
      } else {
        router.refresh();
      }
    },
  });

  // Manual refresh function
  const refresh = useCallback(() => {
    lastRefreshRef.current = Date.now();
    router.refresh();
  }, [router]);

  return { refresh, lastRefreshTime: lastRefreshRef };
}
