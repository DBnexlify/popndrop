"use client";

// =============================================================================
// PWA PROVIDER - COMPLETE REWRITE FOR RELIABILITY
// components/admin/pwa-provider.tsx
// =============================================================================

import { useEffect, useState, createContext, useContext, useCallback, useRef } from "react";
import { Bell, BellOff, Download, X, CheckCircle2, Loader2, Share, PlusSquare, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

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
// NOTIFICATION TOGGLE - SIMPLIFIED
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
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleToggle = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      if (isSubscribed) {
        await unsubscribe();
        setSuccess("Notifications turned off");
      } else {
        const result = await subscribe();
        if (result.success) {
          setSuccess("Notifications enabled!");
        } else {
          setError(result.error || "Failed");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
      setTimeout(() => { setSuccess(null); setError(null); }, 3000);
    }
  };

  // Not supported
  if (typeof window === "undefined" || !("Notification" in window)) {
    return (
      <div className="rounded-lg bg-neutral-800 p-4 text-sm text-neutral-400">
        <BellOff className="mb-2 h-5 w-5" />
        <p>Push notifications are not supported on this device.</p>
      </div>
    );
  }

  // Permission denied
  if (notificationPermission === "denied") {
    return (
      <div className="rounded-lg bg-red-500/10 p-4 text-sm text-red-400">
        <BellOff className="mb-2 h-5 w-5" />
        <p className="font-medium">Notifications Blocked</p>
        <p className="mt-1 text-xs opacity-70">
          You&apos;ll need to enable notifications in your browser/phone settings.
        </p>
      </div>
    );
  }

  // VAPID not configured
  if (!vapidConfigured) {
    return (
      <div className="rounded-lg bg-amber-500/10 p-4 text-sm text-amber-400">
        <AlertTriangle className="mb-2 h-5 w-5" />
        <p className="font-medium">Not Configured</p>
        <p className="mt-1 text-xs opacity-70">
          Push notifications haven&apos;t been set up on the server yet.
        </p>
      </div>
    );
  }

  // Service worker error
  if (swStatus === "error") {
    return (
      <div className="rounded-lg bg-red-500/10 p-4 text-sm text-red-400">
        <AlertTriangle className="mb-2 h-5 w-5" />
        <p className="font-medium">Service Worker Error</p>
        <p className="mt-1 text-xs opacity-70">{swError || "Failed to initialize"}</p>
        <Button
          size="sm"
          variant="outline"
          onClick={retryServiceWorker}
          className="mt-2 border-red-500/30 text-red-400"
        >
          <RefreshCw className="mr-2 h-3 w-3" /> Retry
        </Button>
      </div>
    );
  }

  // Loading service worker
  if (swStatus === "loading") {
    return (
      <div className="rounded-lg bg-neutral-800 p-4 text-sm text-neutral-400">
        <Loader2 className="mb-2 h-5 w-5 animate-spin" />
        <p>Setting up notifications...</p>
      </div>
    );
  }

  // Ready - show toggle
  return (
    <div className="space-y-3">
      <button
        onClick={handleToggle}
        disabled={loading}
        className={`flex w-full items-center justify-between rounded-xl p-4 transition-all active:scale-[0.98] ${
          isSubscribed
            ? "bg-green-500/20 border-2 border-green-500/40"
            : "bg-neutral-800 border-2 border-neutral-700 hover:border-neutral-600"
        } ${loading ? "opacity-60 cursor-wait" : "cursor-pointer"}`}
      >
        <div className="flex items-center gap-3">
          <div className={`flex h-12 w-12 items-center justify-center rounded-full ${
            isSubscribed ? "bg-green-500" : "bg-neutral-700"
          }`}>
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            ) : isSubscribed ? (
              <Bell className="h-6 w-6 text-white" />
            ) : (
              <BellOff className="h-6 w-6 text-neutral-400" />
            )}
          </div>
          
          <div className="text-left">
            <p className={`font-semibold ${isSubscribed ? "text-green-400" : "text-white"}`}>
              {loading ? "Please wait..." : isSubscribed ? "Notifications ON" : "Notifications OFF"}
            </p>
            <p className="text-xs text-neutral-400">
              {isSubscribed ? "Tap to disable" : "Tap to enable"}
            </p>
          </div>
        </div>
        
        {/* Toggle visual - fixed width to prevent deformation */}
        <div className={`h-8 w-14 shrink-0 rounded-full p-1 transition-colors ${
          isSubscribed ? "bg-green-500" : "bg-neutral-600"
        }`}>
          <div className={`h-6 w-6 rounded-full bg-white shadow-md transition-transform duration-200 ${
            isSubscribed ? "translate-x-6" : "translate-x-0"
          }`} />
        </div>
      </button>
      
      {/* Status messages */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      
      {success && (
        <div className="flex items-center gap-2 rounded-lg bg-green-500/10 px-3 py-2 text-xs text-green-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {success}
        </div>
      )}
      
      {isSubscribed && !loading && !success && (
        <p className="text-center text-xs text-neutral-500">
          You&apos;ll receive alerts for new bookings
        </p>
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
