"use client";

// =============================================================================
// ADMIN SETTINGS CLIENT COMPONENT
// app/admin/(dashboard)/settings/settings-client.tsx
// =============================================================================

import { useState } from "react";
import { 
  Bell, 
  BellOff, 
  Smartphone, 
  User, 
  Shield,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Loader2,
  Download,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { usePWA } from "@/components/admin/pwa-provider";
import type { AdminUser } from "@/lib/database-types";

interface SettingsClientProps {
  admin: AdminUser | null;
}

export function SettingsClient({ admin }: SettingsClientProps) {
  const { 
    isInstalled, 
    isInstallable, 
    isIOS,
    isSubscribed, 
    notificationPermission,
    subscribe, 
    unsubscribe,
    install,
  } = usePWA();
  
  const [loading, setLoading] = useState(false);
  const [showIOSHelp, setShowIOSHelp] = useState(false);

  const handleNotificationToggle = async () => {
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

  const notificationsSupported = typeof window !== "undefined" && "Notification" in window;
  const notificationsBlocked = notificationPermission === "denied";

  return (
    <div className="space-y-6">
      {/* Profile Section */}
      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-600">
            <User className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold">Profile</h2>
            <p className="text-sm text-foreground/60">Your admin account</p>
          </div>
        </div>
        
        <div className="space-y-3 rounded-lg bg-white/[0.02] p-4">
          <div className="flex justify-between">
            <span className="text-sm text-foreground/60">Name</span>
            <span className="text-sm font-medium">{admin?.full_name || "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-foreground/60">Email</span>
            <span className="text-sm font-medium">{admin?.email || "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-foreground/60">Role</span>
            <span className="text-sm font-medium capitalize">{admin?.role || "Admin"}</span>
          </div>
        </div>
      </section>

      {/* App Installation Section */}
      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500/20">
            <Smartphone className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="font-semibold">App Installation</h2>
            <p className="text-sm text-foreground/60">Install for quick access</p>
          </div>
        </div>
        
        <div className="rounded-lg bg-white/[0.02] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Download className="h-5 w-5 text-foreground/60" />
              <div>
                <p className="text-sm font-medium">Install Admin App</p>
                <p className="text-xs text-foreground/50">
                  {isInstalled 
                    ? "App is installed on this device" 
                    : "Add to your home screen for quick access"}
                </p>
              </div>
            </div>
            
            {isInstalled ? (
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-sm font-medium">Installed</span>
              </div>
            ) : isIOS ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowIOSHelp(!showIOSHelp)}
                className="border-cyan-500/30 text-cyan-400"
              >
                How to Install
              </Button>
            ) : isInstallable ? (
              <Button
                size="sm"
                onClick={install}
                className="bg-gradient-to-r from-fuchsia-500 to-purple-600"
              >
                Install
              </Button>
            ) : (
              <span className="text-xs text-foreground/40">
                Open in Chrome to install
              </span>
            )}
          </div>
          
          {/* iOS Instructions */}
          {showIOSHelp && isIOS && (
            <div className="mt-4 rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-4">
              <p className="mb-3 text-sm font-medium text-cyan-300">To install on iPhone/iPad:</p>
              <ol className="space-y-2 text-sm text-foreground/70">
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-xs text-cyan-400">1</span>
                  <span>Tap the <strong>Share</strong> button at the bottom of Safari</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-xs text-cyan-400">2</span>
                  <span>Scroll down and tap <strong>&quot;Add to Home Screen&quot;</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-xs text-cyan-400">3</span>
                  <span>Tap <strong>&quot;Add&quot;</strong> in the top right</span>
                </li>
              </ol>
            </div>
          )}
        </div>
      </section>

      {/* Notifications Section */}
      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
            isSubscribed ? "bg-green-500/20" : "bg-amber-500/20"
          }`}>
            {isSubscribed ? (
              <Bell className="h-5 w-5 text-green-400" />
            ) : (
              <BellOff className="h-5 w-5 text-amber-400" />
            )}
          </div>
          <div>
            <h2 className="font-semibold">Push Notifications</h2>
            <p className="text-sm text-foreground/60">Get notified of new bookings</p>
          </div>
        </div>
        
        {!notificationsSupported ? (
          <div className="rounded-lg bg-red-500/10 p-4">
            <div className="flex items-center gap-3">
              <XCircle className="h-5 w-5 text-red-400" />
              <div>
                <p className="text-sm font-medium text-red-400">Not Supported</p>
                <p className="text-xs text-red-400/70">
                  Your browser doesn&apos;t support push notifications
                </p>
              </div>
            </div>
          </div>
        ) : notificationsBlocked ? (
          <div className="rounded-lg bg-red-500/10 p-4">
            <div className="flex items-center gap-3">
              <XCircle className="h-5 w-5 text-red-400" />
              <div>
                <p className="text-sm font-medium text-red-400">Notifications Blocked</p>
                <p className="text-xs text-red-400/70">
                  Enable notifications in your browser settings to receive alerts
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Main Toggle */}
            <div className="flex items-center justify-between rounded-lg bg-white/[0.02] p-4">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-foreground/60" />
                <div>
                  <p className="text-sm font-medium">Enable Notifications</p>
                  <p className="text-xs text-foreground/50">
                    Receive alerts when new bookings come in
                  </p>
                </div>
              </div>
              
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin text-foreground/50" />
              ) : (
                <Switch
                  checked={isSubscribed}
                  onCheckedChange={handleNotificationToggle}
                  className="data-[state=checked]:bg-green-500"
                />
              )}
            </div>
            
            {/* Status indicator */}
            {isSubscribed && (
              <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                  <div>
                    <p className="text-sm font-medium text-green-400">Notifications Active</p>
                    <p className="text-xs text-green-400/70">
                      You&apos;ll receive push notifications for new bookings, payments, and cancellations
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* What you'll get */}
            {!isSubscribed && (
              <div className="rounded-lg border border-white/5 bg-white/[0.01] p-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-foreground/50">
                  You&apos;ll be notified about:
                </p>
                <ul className="space-y-1 text-sm text-foreground/60">
                  <li>• New booking requests</li>
                  <li>• Payment confirmations</li>
                  <li>• Booking cancellations</li>
                  <li>• Daily delivery reminders</li>
                </ul>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Quick Links */}
      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/20">
            <ExternalLink className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <h2 className="font-semibold">Quick Links</h2>
            <p className="text-sm text-foreground/60">Useful resources</p>
          </div>
        </div>
        
        <div className="space-y-2">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-lg bg-white/[0.02] p-4 transition-colors hover:bg-white/[0.04]"
          >
            <span className="text-sm">View Live Website</span>
            <ExternalLink className="h-4 w-4 text-foreground/40" />
          </a>
          
          <a
            href="https://dashboard.stripe.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-lg bg-white/[0.02] p-4 transition-colors hover:bg-white/[0.04]"
          >
            <div>
              <span className="text-sm">Stripe Dashboard</span>
              <p className="text-xs text-foreground/50">View payments & issue refunds</p>
            </div>
            <ExternalLink className="h-4 w-4 text-foreground/40" />
          </a>
        </div>
      </section>

      {/* Security Note */}
      <section className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
        <div className="flex items-start gap-3">
          <Shield className="mt-0.5 h-5 w-5 text-amber-400" />
          <div>
            <p className="text-sm font-medium text-amber-300">Security Reminder</p>
            <p className="text-xs text-amber-300/70">
              Always log out when using shared devices. Your admin session will expire after 7 days of inactivity.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
