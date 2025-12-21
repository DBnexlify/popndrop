"use client";

// =============================================================================
// ADMIN SETTINGS CLIENT COMPONENT
// app/admin/(dashboard)/settings/settings-client.tsx
// =============================================================================

import { useState } from "react";
import { 
  Smartphone, 
  User, 
  Shield,
  ExternalLink,
  CheckCircle2,
  Download,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePWA, NotificationToggle } from "@/components/admin/pwa-provider";
import type { AdminUser } from "@/lib/database-types";

interface SettingsClientProps {
  admin: AdminUser | null;
}

export function SettingsClient({ admin }: SettingsClientProps) {
  const { 
    isInstalled, 
    isInstallable, 
    isIOS,
    install,
    swStatus,
    vapidConfigured,
  } = usePWA();
  
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const isAndroid = typeof window !== "undefined" && /Android/i.test(navigator.userAgent);

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
                    : "Add to your home screen"}
                </p>
              </div>
            </div>
            
            {isInstalled ? (
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-sm font-medium">Installed</span>
              </div>
            ) : isInstallable ? (
              <Button
                size="sm"
                onClick={install}
                className="bg-gradient-to-r from-fuchsia-500 to-purple-600"
              >
                Install
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowInstallHelp(!showInstallHelp)}
                className="border-cyan-500/30 text-cyan-400"
              >
                How to Install
              </Button>
            )}
          </div>
          
          {showInstallHelp && !isInstalled && (
            <div className="mt-4 rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-4">
              {isIOS ? (
                <>
                  <p className="mb-3 text-sm font-medium text-cyan-300">On iPhone/iPad:</p>
                  <ol className="space-y-2 text-sm text-foreground/70">
                    <li>1. Tap the <strong>Share</strong> button at the bottom of Safari</li>
                    <li>2. Scroll down and tap <strong>&quot;Add to Home Screen&quot;</strong></li>
                    <li>3. Tap <strong>&quot;Add&quot;</strong></li>
                  </ol>
                </>
              ) : isAndroid ? (
                <>
                  <p className="mb-3 text-sm font-medium text-cyan-300">On Android:</p>
                  <ol className="space-y-2 text-sm text-foreground/70">
                    <li>1. Tap the <MoreVertical className="inline h-4 w-4" /> <strong>menu</strong> in Chrome</li>
                    <li>2. Tap <strong>&quot;Add to Home screen&quot;</strong> or <strong>&quot;Install app&quot;</strong></li>
                    <li>3. Tap <strong>&quot;Add&quot;</strong> or <strong>&quot;Install&quot;</strong></li>
                  </ol>
                </>
              ) : (
                <>
                  <p className="mb-3 text-sm font-medium text-cyan-300">On Desktop:</p>
                  <ol className="space-y-2 text-sm text-foreground/70">
                    <li>1. Look for the install icon in Chrome&apos;s address bar</li>
                    <li>2. Or click the <MoreVertical className="inline h-4 w-4" /> menu → <strong>&quot;Install Pop & Drop Admin&quot;</strong></li>
                  </ol>
                </>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Notifications Section */}
      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <div className="mb-4">
          <h2 className="font-semibold">Push Notifications</h2>
          <p className="text-sm text-foreground/60">Get notified of new bookings</p>
        </div>
        
        <NotificationToggle />
        
        {/* Debug info */}
        <div className="mt-4 rounded-lg bg-neutral-800/50 p-3 text-xs font-mono text-neutral-500">
          <p>SW Status: {swStatus}</p>
          <p>VAPID: {vapidConfigured ? "✓ configured" : "✗ missing"}</p>
        </div>
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
              Always log out when using shared devices.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
