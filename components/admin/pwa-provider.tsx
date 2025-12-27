"use client";

// =============================================================================
// PWA PROVIDER - COMPLETE REWRITE FOR RELIABILITY
// components/admin/pwa-provider.tsx
// =============================================================================

import { useEffect, useState, createContext, useContext, useCallback, useRef } from "react";
import { Bell, BellOff, Download, X, CheckCircle2, Loader2, Share, PlusSquare, AlertTriangle, RefreshCw, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isAudioEnabled, setAudioEnabled, playNewBookingSound, testSound } from "@/lib/admin-sounds";

// =============================================================================
// TYPES
// =============================================================================

type SWStatus = "loading" | "ready" | "error" | "unsupported";

interface PWAContextType {
  isInstalled: boolean;
  isInstallable: boolean;
  isIOS: boolean;
  isOnline: boolean;
  notificationPermission: NotificationPermission | "default";
  isSubscribed: boolean;
  swStatus: SWStatus;
  swError: string | null;
  vapidConfigured: boolean;
  install: () => Promise<void>;
  subscribe: () => Promise<{ success: boolean; error?: string }>;
  unsubscribe: () => Promise<void>;
  retryServiceWorker: () => void;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// =============================================================================
// CONTEXT
// =============================================================================

const PWAContext = createContext<PWAContextType | null>(null);

export function usePWA() {
  const context = useContext(PWAContext);
  if (!context) {
    throw new Error("usePWA must be used within PWAProvider");
  }
  return context;
}

// =============================================================================
// VAPID KEY
// =============================================================================

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

// =============================================================================
// HELPERS
// =============================================================================

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer as ArrayBuffer;
}

function isIOS(): boolean {
  if (typeof window === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

// Wait for service worker to reach a specific state with timeout
async function waitForSWState(
  sw: ServiceWorker,
  targetState: ServiceWorkerState,
  timeoutMs: number = 10000
): Promise<boolean> {
  if (sw.state === targetState) return true;
  
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      sw.removeEventListener("statechange", onChange);
      resolve(false);
    }, timeoutMs);
    
    const onChange = () => {
      console.log("[PWA] SW state changed to:", sw.state);
      if (sw.state === targetState) {
        clearTimeout(timeout);
        sw.removeEventListener("statechange", onChange);
        resolve(true);
      }
    };
    
    sw.addEventListener("statechange", onChange);
  });
}

// =============================================================================
// PROVIDER COMPONENT
// =============================================================================

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [swStatus, setSwStatus] = useState<SWStatus>("loading");
  const [swError, setSwError] = useState<string | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const vapidConfigured = !!VAPID_PUBLIC_KEY;

  // ==========================================================================
  // Initialize service worker
  // ==========================================================================
  const initServiceWorker = useCallback(async () => {
    console.log("[PWA] Initializing service worker...");
    setSwStatus("loading");
    setSwError(null);
    
    // Check support
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      console.log("[PWA] Service workers not supported");
      setSwStatus("unsupported");
      return;
    }
    
    try {
      // Unregister any existing service workers first to ensure clean state
      const existingRegs = await navigator.serviceWorker.getRegistrations();
      for (const reg of existingRegs) {
        if (reg.scope.includes("/admin")) {
          console.log("[PWA] Found existing SW, will update");
        }
      }
      
      // Register service worker
      console.log("[PWA] Registering service worker...");
      const registration = await navigator.serviceWorker.register("/admin/sw.js", {
        scope: "/admin/",
      });
      console.log("[PWA] Registration successful:", registration.scope);
      
      // Get the service worker (installing, waiting, or active)
      let sw = registration.installing || registration.waiting || registration.active;
      
      if (!sw) {
        throw new Error("No service worker found after registration");
      }
      
      console.log("[PWA] Current SW state:", sw.state);
      
      // If not yet activated, wait for it
      if (sw.state !== "activated") {
        console.log("[PWA] Waiting for SW to activate...");
        const activated = await waitForSWState(sw, "activated", 15000);
        
        if (!activated) {
          // Check if there's now an active worker
          if (registration.active) {
            sw = registration.active;
            console.log("[PWA] Using active worker from registration");
          } else {
            throw new Error("Service worker failed to activate within timeout");
          }
        }
      }
      
      console.log("[PWA] Service worker is active!");
      registrationRef.current = registration;
      setSwStatus("ready");
      
      // Check for existing push subscription
      try {
        const subscription = await registration.pushManager.getSubscription();
        console.log("[PWA] Existing push subscription:", !!subscription);
        setIsSubscribed(!!subscription);
      } catch (e) {
        console.warn("[PWA] Could not check push subscription:", e);
      }
      
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("[PWA] Service worker init failed:", message);
      setSwStatus("error");
      setSwError(message);
    }
  }, []);

  // ==========================================================================
  // Effects
  // ==========================================================================
  
  // Initialize on mount
  useEffect(() => {
    setIsIOSDevice(isIOS());
    setIsInstalled(isStandalone());
    
    // Check notification permission
    if ("Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
    
    // Init service worker
    initServiceWorker();
    
    // Standalone mode change listener
    const mq = window.matchMedia("(display-mode: standalone)");
    const handleChange = () => setIsInstalled(isStandalone());
    mq.addEventListener("change", handleChange);
    
    return () => mq.removeEventListener("change", handleChange);
  }, [initServiceWorker]);

  // Install prompt listener
  useEffect(() => {
    const handler = (e: Event) => {
      console.log("[PWA] beforeinstallprompt fired");
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };
    
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Online/offline listener
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    setIsOnline(navigator.onLine);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // ==========================================================================
  // Actions
  // ==========================================================================

  const install = useCallback(async () => {
    if (!deferredPrompt) return;
    
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log("[PWA] Install outcome:", outcome);
      
      if (outcome === "accepted") {
        setIsInstalled(true);
        setIsInstallable(false);
      }
      setDeferredPrompt(null);
    } catch (err) {
      console.error("[PWA] Install failed:", err);
    }
  }, [deferredPrompt]);

  const subscribe = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    console.log("[PWA] Subscribe called");
    
    const registration = registrationRef.current;
    
    if (!registration) {
      return { success: false, error: "Service worker not ready. Please refresh." };
    }
    
    if (!vapidConfigured) {
      return { success: false, error: "Push not configured on server." };
    }
    
    try {
      // Request permission
      console.log("[PWA] Requesting notification permission...");
      const permission = await Notification.requestPermission();
      console.log("[PWA] Permission:", permission);
      setNotificationPermission(permission);
      
      if (permission !== "granted") {
        return { success: false, error: "Permission denied" };
      }
      
      // Create subscription
      console.log("[PWA] Creating push subscription...");
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      console.log("[PWA] Subscription created:", subscription.endpoint.slice(0, 50) + "...");
      
      // Save to server
      console.log("[PWA] Saving to server...");
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Server error: ${response.status}`);
      }
      
      console.log("[PWA] Subscription saved!");
      setIsSubscribed(true);
      return { success: true };
      
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("[PWA] Subscribe failed:", message);
      return { success: false, error: message };
    }
  }, [vapidConfigured]);

  const unsubscribe = useCallback(async () => {
    const registration = registrationRef.current;
    if (!registration) return;
    
    try {
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
        setIsSubscribed(false);
        console.log("[PWA] Unsubscribed");
      }
    } catch (err) {
      console.error("[PWA] Unsubscribe failed:", err);
    }
  }, []);

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <PWAContext.Provider
      value={{
        isInstalled,
        isInstallable,
        isIOS: isIOSDevice,
        isOnline,
        notificationPermission,
        isSubscribed,
        swStatus,
        swError,
        vapidConfigured,
        install,
        subscribe,
        unsubscribe,
        retryServiceWorker: initServiceWorker,
      }}
    >
      {children}
    </PWAContext.Provider>
  );
}

// =============================================================================
// SHARED TOGGLE STYLES
// Both toggles use identical dimensions and styling for consistency
// =============================================================================

const toggleStyles = {
  // Track: matches the WORKING toggle in settings-client.tsx (48x28px)
  track: "h-7 w-12 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200",
  // Knob: 24x24px circle
  knob: "h-6 w-6 rounded-full bg-white shadow-lg transition-transform duration-200",
  // Container
  container: "group flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-white/5",
  // Label
  label: "text-xs font-medium transition-colors",
} as const;

// =============================================================================
// NOTIFICATION TOGGLE - HORIZONTAL (matches Sound toggle)
// =============================================================================

export function NotificationToggle() {
  const {
    notificationPermission,
    isSubscribed,
    subscribe,
    unsubscribe,
    swStatus,
    swError,
    vapidConfigured,
    retryServiceWorker,
  } = usePWA();
  
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  // Ensure consistent render between server and client (fixes hydration mismatch)
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleToggle = async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (isSubscribed) {
        await unsubscribe();
      } else {
        const result = await subscribe();
        if (!result.success) {
          setError(result.error || "Failed");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
      setTimeout(() => setError(null), 3000);
    }
  };

  // CRITICAL: This must be FIRST - before any window/browser checks
  // Both server AND client render this initially, preventing hydration mismatch
  if (!mounted) {
    return (
      <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground/40">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-xs">Loading...</span>
      </div>
    );
  }

  // Now safe to check browser APIs (only runs on client after mount)
  if (!("Notification" in window)) {
    return (
      <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground/40">
        <BellOff className="h-4 w-4" />
        <span className="text-xs">Not supported</span>
      </div>
    );
  }

  // Permission denied - show blocked state
  if (notificationPermission === "denied") {
    return (
      <div 
        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-400/70"
        title="Notifications blocked in browser settings"
      >
        <BellOff className="h-4 w-4" />
        <span className="text-xs">Blocked</span>
      </div>
    );
  }

  // VAPID not configured
  if (!vapidConfigured) {
    return (
      <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-amber-400/70">
        <AlertTriangle className="h-4 w-4" />
        <span className="text-xs">Not configured</span>
      </div>
    );
  }

  // Service worker error - show retry option
  if (swStatus === "error") {
    return (
      <button
        onClick={retryServiceWorker}
        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-400/70 transition-colors hover:bg-white/5 hover:text-red-400"
      >
        <RefreshCw className="h-4 w-4" />
        <span className="text-xs">Retry</span>
      </button>
    );
  }

  // Loading service worker
  if (swStatus === "loading") {
    return (
      <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground/40">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-xs">Loading...</span>
      </div>
    );
  }

  // Ready - show horizontal toggle (matching Sound toggle exactly)
  return (
    <div className="relative">
      <button
        onClick={handleToggle}
        disabled={loading}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`${toggleStyles.container} ${loading ? "opacity-60 cursor-wait" : "cursor-pointer"}`}
        aria-label={isSubscribed ? "Turn off notifications" : "Turn on notifications"}
      >
        {/* Horizontal Toggle Track */}
        <div className={`${toggleStyles.track} ${
          isSubscribed 
            ? "bg-gradient-to-r from-green-500 to-green-600" 
            : "bg-white/10"
        }`}>
          {/* Sliding Knob */}
          <div className={`${toggleStyles.knob} ${
            isSubscribed ? "translate-x-[18px]" : "translate-x-0.5"
          }`} />
        </div>
        
        {/* Label */}
        <span className={`${toggleStyles.label} ${
          isSubscribed ? "text-green-400" : "text-foreground/50"
        }`}>
          {loading ? "..." : isSubscribed ? "Alerts on" : "Alerts off"}
        </span>
      </button>
      
      {/* Tooltip on hover */}
      {showTooltip && !loading && (
        <div className="absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md bg-neutral-800 px-2 py-1 text-[10px] text-neutral-300 shadow-lg">
          {isSubscribed ? "Click to disable" : "Click to enable"}
          <div className="absolute -left-1 top-1/2 h-2 w-2 -translate-y-1/2 rotate-45 bg-neutral-800" />
        </div>
      )}
      
      {/* Error toast */}
      {error && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-md bg-red-500/20 px-2 py-1 text-[10px] text-red-400">
          {error}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// PWA INSTALL PROMPT
// =============================================================================

export function PWAInstallPrompt() {
  const { isInstallable, isInstalled, isIOS, install } = usePWA();
  const [dismissed, setDismissed] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const d = localStorage.getItem("pwa-dismissed");
    if (d && Date.now() - parseInt(d) < 7 * 24 * 60 * 60 * 1000) {
      setDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("pwa-dismissed", Date.now().toString());
  };

  if (isInstalled || dismissed) return null;
  if (!isInstallable && !isIOS) return null;

  if (showHelp) {
    return (
      <div className="fixed inset-0 z-[70] flex items-end bg-black/60 p-4 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <h3 className="mb-4 text-lg font-bold">Install App</h3>
          
          {isIOS ? (
            <ol className="space-y-3 text-sm text-neutral-300">
              <li className="flex gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-xs text-cyan-400">1</span>
                Tap <Share className="mx-1 inline h-4 w-4" /> <strong>Share</strong> button below
              </li>
              <li className="flex gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-xs text-cyan-400">2</span>
                Scroll and tap <PlusSquare className="mx-1 inline h-4 w-4" /> <strong>Add to Home Screen</strong>
              </li>
              <li className="flex gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-xs text-cyan-400">3</span>
                Tap <strong>Add</strong>
              </li>
            </ol>
          ) : (
            <ol className="space-y-3 text-sm text-neutral-300">
              <li className="flex gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-xs text-cyan-400">1</span>
                Tap the <strong>⋮ menu</strong> in Chrome
              </li>
              <li className="flex gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-xs text-cyan-400">2</span>
                Tap <strong>Add to Home screen</strong> or <strong>Install app</strong>
              </li>
            </ol>
          )}
          
          <Button onClick={() => setShowHelp(false)} className="mt-6 w-full">
            Got it
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 lg:bottom-4 lg:left-auto lg:right-4 lg:w-80">
      <div className="relative rounded-xl border border-neutral-800 bg-neutral-900 p-4 shadow-2xl">
        <button onClick={handleDismiss} className="absolute right-2 top-2 p-1 text-neutral-500">
          <X className="h-4 w-4" />
        </button>
        
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-600">
            <Download className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-semibold">Install Admin App</p>
            <p className="text-sm text-neutral-400">Quick access from home screen</p>
            <Button
              size="sm"
              onClick={isIOS || !isInstallable ? () => setShowHelp(true) : install}
              className="mt-3 bg-gradient-to-r from-fuchsia-500 to-purple-600"
            >
              {isIOS || !isInstallable ? "How to Install" : "Install Now"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// OFFLINE INDICATOR
// =============================================================================

export function OfflineIndicator() {
  const { isOnline } = usePWA();
  if (isOnline) return null;
  
  return (
    <div className="fixed left-0 right-0 top-0 z-50 bg-amber-500 py-1 text-center text-sm font-medium text-black">
      You&apos;re offline
    </div>
  );
}

// =============================================================================
// SOUND TOGGLE - HORIZONTAL (reference design for both toggles)
// =============================================================================

export function SoundToggle() {
  const [enabled, setEnabled] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  
  // Initialize from localStorage on mount
  useEffect(() => {
    setEnabled(isAudioEnabled());
  }, []);
  
  const handleToggle = () => {
    const newState = !enabled;
    setEnabled(newState);
    setAudioEnabled(newState);
    
    // Play test sound when enabling
    if (newState) {
      // Small delay to let state update
      setTimeout(() => playNewBookingSound(), 100);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleToggle}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={toggleStyles.container}
        aria-label={enabled ? "Turn off sounds" : "Turn on sounds"}
      >
        {/* Horizontal Toggle Track */}
        <div className={`${toggleStyles.track} ${
          enabled 
            ? "bg-gradient-to-r from-cyan-500 to-cyan-600" 
            : "bg-white/10"
        }`}>
          {/* Sliding Knob */}
          <div className={`${toggleStyles.knob} ${
            enabled ? "translate-x-[18px]" : "translate-x-0.5"
          }`} />
        </div>
        
        {/* Label */}
        <span className={`${toggleStyles.label} ${
          enabled ? "text-cyan-400" : "text-foreground/50"
        }`}>
          {enabled ? "Sound on" : "Sound off"}
        </span>
      </button>
      
      {/* Tooltip on hover */}
      {showTooltip && (
        <div className="absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md bg-neutral-800 px-2 py-1 text-[10px] text-neutral-300 shadow-lg">
          {enabled ? "Click to mute" : "Click to enable sounds"}
          <div className="absolute -left-1 top-1/2 h-2 w-2 -translate-y-1/2 rotate-45 bg-neutral-800" />
        </div>
      )}
    </div>
  );
}
