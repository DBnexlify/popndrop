"use client";

// =============================================================================
// PWA REGISTRATION & PUSH NOTIFICATIONS
// components/admin/pwa-provider.tsx
// Handles service worker registration and push notification setup
// =============================================================================

import { useEffect, useState, createContext, useContext, useCallback } from "react";
import { Bell, BellOff, Download, X, CheckCircle2, Loader2, Share, PlusSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

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
  install: () => Promise<void>;
  subscribe: () => Promise<void>;
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
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Check platform and install status
  useEffect(() => {
    setIsIOS(isIOSDevice());
    setIsInstalled(isInStandaloneMode());
    
    const handleChange = () => setIsInstalled(isInStandaloneMode());
    window.matchMedia("(display-mode: standalone)").addEventListener("change", handleChange);
    return () => {
      window.matchMedia("(display-mode: standalone)").removeEventListener("change", handleChange);
    };
  }, []);

  // Register service worker
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const registerSW = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/admin/sw.js", {
          scope: "/admin/",
        });
        console.log("[PWA] Service worker registered:", reg.scope);
        setRegistration(reg);

        // Check for existing subscription
        const subscription = await reg.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      } catch (error) {
        console.error("[PWA] Service worker registration failed:", error);
      }
    };

    registerSW();
  }, []);

  // Listen for install prompt (Android/Desktop Chrome)
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
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
    }
  }, []);

  // Install PWA (Android/Desktop)
  const install = useCallback(async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === "accepted") {
        setIsInstalled(true);
        setIsInstallable(false);
      }
      
      setDeferredPrompt(null);
    } catch (error) {
      console.error("[PWA] Install failed:", error);
    }
  }, [deferredPrompt]);

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    if (!registration || !VAPID_PUBLIC_KEY) {
      console.error("[PWA] No service worker registration or VAPID key");
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);

      if (permission !== "granted") {
        console.log("[PWA] Notification permission denied");
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      console.log("[PWA] Push subscription:", subscription);

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });

      if (response.ok) {
        setIsSubscribed(true);
        console.log("[PWA] Subscription saved to server");
      } else {
        throw new Error("Failed to save subscription");
      }
    } catch (error) {
      console.error("[PWA] Subscribe failed:", error);
    }
  }, [registration]);

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
        console.log("[PWA] Unsubscribed from push notifications");
      }
    } catch (error) {
      console.error("[PWA] Unsubscribe failed:", error);
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

  // Check localStorage for dismissed state
  useEffect(() => {
    const wasDismissed = localStorage.getItem("pwa-install-dismissed");
    if (wasDismissed) {
      const dismissedAt = parseInt(wasDismissed, 10);
      // Show again after 7 days
      if (Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) {
        setDismissed(true);
      }
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("pwa-install-dismissed", Date.now().toString());
  };

  // Don't show if already installed or dismissed
  if (isInstalled || dismissed) return null;

  // Don't show if not installable and not iOS
  if (!isInstallable && !isIOS) return null;

  // iOS Instructions Modal
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
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-blue-400">
                1
              </div>
              <div>
                <p className="font-medium">Tap the Share button</p>
                <p className="text-sm text-foreground/60">
                  <Share className="mb-0.5 inline h-4 w-4" /> at the bottom of Safari
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-blue-400">
                2
              </div>
              <div>
                <p className="font-medium">Scroll down and tap</p>
                <p className="text-sm text-foreground/60">
                  <PlusSquare className="mb-0.5 inline h-4 w-4" /> &quot;Add to Home Screen&quot;
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-blue-400">
                3
              </div>
              <div>
                <p className="font-medium">Tap &quot;Add&quot;</p>
                <p className="text-sm text-foreground/60">
                  The app will appear on your home screen
                </p>
              </div>
            </div>
          </div>
          
          <Button
            onClick={() => setShowIOSInstructions(false)}
            className="mt-6 w-full bg-gradient-to-r from-fuchsia-500 to-purple-600"
          >
            Got it!
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 lg:bottom-4 lg:left-auto lg:right-4 lg:w-80">
      <div className="relative overflow-hidden rounded-xl border border-white/10 bg-neutral-900/95 p-4 shadow-[0_20px_70px_rgba(0,0,0,0.4)] backdrop-blur-xl">
        <button
          onClick={handleDismiss}
          className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-foreground/50 hover:bg-white/10"
        >
          <X className="h-4 w-4" />
        </button>
        
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-600">
            <Download className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="font-medium">Install Admin App</p>
            <p className="mt-0.5 text-sm text-foreground/60">
              Quick access from your home screen
            </p>
            <Button
              onClick={isIOS ? () => setShowIOSInstructions(true) : install}
              size="sm"
              className="mt-3 bg-gradient-to-r from-fuchsia-500 to-purple-600"
            >
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
// NOTIFICATION TOGGLE COMPONENT
// =============================================================================

export function NotificationToggle() {
  const { notificationPermission, isSubscribed, subscribe, unsubscribe } = usePWA();
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    try {
      if (isSubscribed) {
        await unsubscribe();
      } else {
        await subscribe();
      }
    } finally {
      setLoading(false);
    }
  };

  // Don't show if notifications not supported
  if (typeof window === "undefined" || !("Notification" in window)) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2.5 text-sm text-foreground/50">
        <BellOff className="h-4 w-4" />
        <span>Notifications not supported</span>
      </div>
    );
  }

  // Permission denied
  if (notificationPermission === "denied") {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2.5 text-sm text-red-400">
        <BellOff className="h-4 w-4" />
        <span>Blocked in browser settings</span>
      </div>
    );
  }

  return (
    <div className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 ${
      isSubscribed ? "bg-green-500/10" : "bg-white/5"
    }`}>
      <div className="flex items-center gap-2">
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-foreground/50" />
        ) : isSubscribed ? (
          <Bell className="h-4 w-4 text-green-400" />
        ) : (
          <BellOff className="h-4 w-4 text-foreground/50" />
        )}
        <span className={`text-sm ${
          isSubscribed ? "text-green-400" : "text-foreground/70"
        }`}>
          {loading
            ? "Processing..."
            : isSubscribed
            ? "Notifications On"
            : "Notifications Off"}
        </span>
      </div>
      
      <Switch
        checked={isSubscribed}
        onCheckedChange={handleToggle}
        disabled={loading}
        className="data-[state=checked]:bg-green-500"
      />
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
