"use client";

// =============================================================================
// PWA REGISTRATION & PUSH NOTIFICATIONS
// components/admin/pwa-provider.tsx
// Handles service worker registration and push notification setup
// =============================================================================

import { useEffect, useState, createContext, useContext, useCallback } from "react";
import { Bell, BellOff, Download, X, CheckCircle2, Loader2, Share, PlusSquare, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

// =============================================================================
// TYPES
// =============================================================================

interface PWAContextType {
  isInstalled: boolean;
  isInstallable: boolean;
  isIOS: boolean;
  isOnline: boolean;
  notificationPermission: NotificationPermission | "default";
  isSubscribed: boolean;
  swRegistered: boolean;
  vapidConfigured: boolean;
  error: string | null;
  install: () => Promise<void>;
  subscribe: () => Promise<{ success: boolean; error?: string }>;
  unsubscribe: () => Promise<void>;
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
// VAPID PUBLIC KEY
// =============================================================================

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

// =============================================================================
// HELPER FUNCTIONS
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

function isIOSDevice(): boolean {
  if (typeof window === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream;
}

function isInStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

// =============================================================================
// PROVIDER COMPONENT
// =============================================================================

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [swRegistered, setSwRegistered] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  const vapidConfigured = !!VAPID_PUBLIC_KEY;

  // Check platform and install status
  useEffect(() => {
    setIsIOS(isIOSDevice());
    setIsInstalled(isInStandaloneMode());
    console.log("[PWA] VAPID configured:", vapidConfigured);
    console.log("[PWA] Is iOS:", isIOSDevice());
    
    const handleChange = () => setIsInstalled(isInStandaloneMode());
    window.matchMedia("(display-mode: standalone)").addEventListener("change", handleChange);
    return () => {
      window.matchMedia("(display-mode: standalone)").removeEventListener("change", handleChange);
    };
  }, [vapidConfigured]);

  // Register service worker and wait for it to be ready
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      console.log("[PWA] Service workers not supported");
      return;
    }

    const registerSW = async () => {
      try {
        // First register the service worker
        const reg = await navigator.serviceWorker.register("/admin/sw.js", {
          scope: "/admin/",
        });
        console.log("[PWA] Service worker registered:", reg.scope);
        
        // Wait for the service worker to be ready (active)
        const readyReg = await navigator.serviceWorker.ready;
        console.log("[PWA] Service worker is ready/active:", readyReg.scope);
        
        setRegistration(readyReg);
        setSwRegistered(true);

        // Now check for existing subscription
        const subscription = await readyReg.pushManager.getSubscription();
        console.log("[PWA] Existing subscription:", !!subscription);
        setIsSubscribed(!!subscription);
      } catch (err) {
        console.error("[PWA] Service worker registration failed:", err);
        setError("Service worker failed to register");
      }
    };

    registerSW();
  }, []);

  // Listen for install prompt
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      console.log("[PWA] beforeinstallprompt fired");
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  // Track online/offline status
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

  // Check notification permission
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationPermission(Notification.permission);
      console.log("[PWA] Notification permission:", Notification.permission);
    }
  }, []);

  // Install PWA
  const install = useCallback(async () => {
    if (!deferredPrompt) {
      console.log("[PWA] No deferred prompt available");
      return;
    }

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

  // Subscribe to push notifications
  const subscribe = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    console.log("[PWA] Subscribe called");
    console.log("[PWA] Registration:", !!registration);
    console.log("[PWA] VAPID key configured:", vapidConfigured);
    
    if (!registration) {
      const msg = "Service worker not registered. Please refresh the page.";
      console.error("[PWA]", msg);
      setError(msg);
      return { success: false, error: msg };
    }
    
    if (!vapidConfigured) {
      const msg = "Push notifications not configured. Contact support.";
      console.error("[PWA]", msg);
      setError(msg);
      return { success: false, error: msg };
    }

    try {
      console.log("[PWA] Requesting notification permission...");
      const permission = await Notification.requestPermission();
      console.log("[PWA] Permission result:", permission);
      setNotificationPermission(permission);

      if (permission !== "granted") {
        const msg = "Notification permission denied";
        console.log("[PWA]", msg);
        return { success: false, error: msg };
      }

      console.log("[PWA] Creating push subscription...");
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      console.log("[PWA] Push subscription created:", subscription.endpoint);

      console.log("[PWA] Saving to server...");
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });

      if (response.ok) {
        setIsSubscribed(true);
        setError(null);
        console.log("[PWA] Subscription saved successfully");
        return { success: true };
      } else {
        const data = await response.json().catch(() => ({}));
        const msg = data.error || "Failed to save subscription to server";
        console.error("[PWA]", msg);
        setError(msg);
        return { success: false, error: msg };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error("[PWA] Subscribe failed:", err);
      setError(msg);
      return { success: false, error: msg };
    }
  }, [registration, vapidConfigured]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
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
        setError(null);
        console.log("[PWA] Unsubscribed from push notifications");
      }
    } catch (err) {
      console.error("[PWA] Unsubscribe failed:", err);
    }
  }, [registration]);

  return (
    <PWAContext.Provider
      value={{
        isInstalled,
        isInstallable,
        isIOS,
        isOnline,
        notificationPermission,
        isSubscribed,
        swRegistered,
        vapidConfigured,
        error,
        install,
        subscribe,
        unsubscribe,
      }}
    >
      {children}
    </PWAContext.Provider>
  );
}

// =============================================================================
// INSTALL PROMPT COMPONENT
// =============================================================================

export function PWAInstallPrompt() {
  const { isInstallable, isInstalled, isIOS, install } = usePWA();
  const [dismissed, setDismissed] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    const wasDismissed = localStorage.getItem("pwa-install-dismissed");
    if (wasDismissed) {
      const dismissedAt = parseInt(wasDismissed, 10);
      if (Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) {
        setDismissed(true);
      }
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("pwa-install-dismissed", Date.now().toString());
  };

  if (isInstalled || dismissed) return null;
  if (!isInstallable && !isIOS) return null;

  if (showIOSInstructions) {
    return (
      <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 backdrop-blur-sm p-4 lg:items-center">
        <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-neutral-900 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.4)]">
          <button
            onClick={() => setShowIOSInstructions(false)}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
          
          <h3 className="mb-4 text-lg font-semibold">Install on iPhone/iPad</h3>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-blue-400">1</div>
              <div>
                <p className="font-medium">Tap the Share button</p>
                <p className="text-sm text-foreground/60"><Share className="mb-0.5 inline h-4 w-4" /> at the bottom of Safari</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-blue-400">2</div>
              <div>
                <p className="font-medium">Scroll down and tap</p>
                <p className="text-sm text-foreground/60"><PlusSquare className="mb-0.5 inline h-4 w-4" /> &quot;Add to Home Screen&quot;</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-blue-400">3</div>
              <div>
                <p className="font-medium">Tap &quot;Add&quot;</p>
                <p className="text-sm text-foreground/60">The app will appear on your home screen</p>
              </div>
            </div>
          </div>
          
          <Button onClick={() => setShowIOSInstructions(false)} className="mt-6 w-full bg-gradient-to-r from-fuchsia-500 to-purple-600">
            Got it!
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 lg:bottom-4 lg:left-auto lg:right-4 lg:w-80">
      <div className="relative overflow-hidden rounded-xl border border-white/10 bg-neutral-900/95 p-4 shadow-[0_20px_70px_rgba(0,0,0,0.4)] backdrop-blur-xl">
        <button onClick={handleDismiss} className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-foreground/50 hover:bg-white/10">
          <X className="h-4 w-4" />
        </button>
        
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-600">
            <Download className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="font-medium">Install Admin App</p>
            <p className="mt-0.5 text-sm text-foreground/60">Quick access from your home screen</p>
            <Button onClick={isIOS ? () => setShowIOSInstructions(true) : install} size="sm" className="mt-3 bg-gradient-to-r from-fuchsia-500 to-purple-600">
              {isIOS ? "Show Me How" : "Install Now"}
            </Button>
          </div>
        </div>
        
        <div className="pointer-events-none absolute inset-0 rounded-xl [box-shadow:inset_0_0_0_1px_rgba(255,255,255,0.07)]" />
      </div>
    </div>
  );
}

// =============================================================================
// NOTIFICATION TOGGLE COMPONENT - SIMPLIFIED BUTTON VERSION
// =============================================================================

export function NotificationToggle() {
  const { 
    notificationPermission, 
    isSubscribed, 
    subscribe, 
    unsubscribe,
    swRegistered,
    vapidConfigured,
    error: contextError,
  } = usePWA();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");

  const handleClick = async () => {
    console.log("[Toggle] Button clicked, isSubscribed:", isSubscribed);
    setStatus("Working...");
    setLoading(true);
    setError(null);
    
    try {
      if (isSubscribed) {
        console.log("[Toggle] Unsubscribing...");
        await unsubscribe();
        setStatus("Turned off!");
      } else {
        console.log("[Toggle] Subscribing...");
        const result = await subscribe();
        console.log("[Toggle] Subscribe result:", result);
        if (result.success) {
          setStatus("Turned on!");
        } else {
          setError(result.error || "Failed to enable");
          setStatus("");
        }
      }
    } catch (err) {
      console.error("[Toggle] Error:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      setStatus("");
    } finally {
      setLoading(false);
      // Clear status after 2 seconds
      setTimeout(() => setStatus(""), 2000);
    }
  };

  // Not supported
  if (typeof window === "undefined" || !("Notification" in window)) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2.5 text-sm text-foreground/50">
        <BellOff className="h-4 w-4" />
        <span>Notifications not supported on this device</span>
      </div>
    );
  }

  // Permission denied
  if (notificationPermission === "denied") {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2.5 text-sm text-red-400">
        <BellOff className="h-4 w-4" />
        <span>Blocked - check browser settings</span>
      </div>
    );
  }

  // Not configured
  if (!vapidConfigured) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2.5 text-sm text-amber-400">
        <AlertTriangle className="h-4 w-4" />
        <span>Push not configured - redeploy needed</span>
      </div>
    );
  }

  // Service worker not ready
  if (!swRegistered) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2.5 text-sm text-amber-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading service worker...</span>
      </div>
    );
  }

  const displayError = error || contextError;

  return (
    <div className="space-y-2">
      {/* Big clickable button */}
      <button
        onClick={handleClick}
        disabled={loading}
        className={`flex w-full items-center justify-between rounded-xl px-4 py-4 transition-all active:scale-[0.98] ${
          isSubscribed 
            ? "bg-green-500/20 border-2 border-green-500/50" 
            : "bg-white/5 border-2 border-white/10 hover:border-white/20"
        } ${loading ? "opacity-70" : ""}`}
      >
        <div className="flex items-center gap-3">
          {loading ? (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : isSubscribed ? (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500">
              <Bell className="h-5 w-5 text-white" />
            </div>
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
              <BellOff className="h-5 w-5 text-foreground/50" />
            </div>
          )}
          
          <div className="text-left">
            <p className={`font-medium ${isSubscribed ? "text-green-400" : ""}`}>
              {loading ? "Please wait..." : isSubscribed ? "Notifications ON" : "Notifications OFF"}
            </p>
            <p className="text-xs text-foreground/50">
              {status || (isSubscribed ? "Tap to turn off" : "Tap to turn on")}
            </p>
          </div>
        </div>
        
        {/* Visual toggle indicator */}
        <div className={`h-8 w-14 rounded-full p-1 transition-colors ${
          isSubscribed ? "bg-green-500" : "bg-white/20"
        }`}>
          <div className={`h-6 w-6 rounded-full bg-white shadow-md transition-transform ${
            isSubscribed ? "translate-x-6" : "translate-x-0"
          }`} />
        </div>
      </button>
      
      {/* Error display */}
      {displayError && (
        <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          <span>{displayError}</span>
        </div>
      )}
      
      {/* Success indicator */}
      {isSubscribed && !loading && (
        <div className="flex items-center gap-2 rounded-lg bg-green-500/10 px-3 py-2 text-xs text-green-400">
          <CheckCircle2 className="h-3 w-3 shrink-0" />
          <span>You&apos;ll get notified of new bookings</span>
        </div>
      )}
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
    <div className="fixed left-0 right-0 top-0 z-50 bg-amber-500 px-4 py-1 text-center text-sm font-medium text-black">
      You&apos;re offline — Some features may be unavailable
    </div>
  );
}
