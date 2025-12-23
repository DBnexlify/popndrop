"use client";

// =============================================================================
// ADMIN SETTINGS CLIENT COMPONENT
// app/admin/(dashboard)/settings/settings-client.tsx
// =============================================================================

import { useState, useEffect } from "react";
import { 
  Smartphone, 
  User, 
  Shield,
  ExternalLink,
  CheckCircle2,
  Download,
  MoreVertical,
  Bell,
  BellOff,
  Send,
  Loader2,
  AlertTriangle,
  Calendar,
  CreditCard,
  XCircle,
  Truck,
  PartyPopper,
  Mail,
  Clock,
  Star,
  Play,
  Volume2,
  VolumeX,
} from "lucide-react";
import { isAudioEnabled, setAudioEnabled, playNewBookingSound } from "@/lib/admin-sounds";
import { Button } from "@/components/ui/button";
import { usePWA } from "@/components/admin/pwa-provider";
import { NotificationPreferencesEditor } from "@/components/admin/notification-preferences";
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
    isSubscribed,
    subscribe,
    unsubscribe,
    notificationPermission,
  } = usePWA();
  
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  
  // Sound state
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // Initialize sound state from localStorage
  useEffect(() => {
    setSoundEnabled(isAudioEnabled());
  }, []);
  
  // Handle sound toggle
  const handleSoundToggle = () => {
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    setAudioEnabled(newState);
    
    // Play a test sound when enabling
    if (newState) {
      setTimeout(() => playNewBookingSound(), 100);
    }
  };
  
  // Cron job test states
  const [deliveryReminderLoading, setDeliveryReminderLoading] = useState(false);
  const [deliveryReminderResult, setDeliveryReminderResult] = useState<{ success: boolean; message: string } | null>(null);
  const [followupEmailLoading, setFollowupEmailLoading] = useState(false);
  const [followupEmailResult, setFollowupEmailResult] = useState<{ success: boolean; message: string } | null>(null);
  const [countdownEmailLoading, setCountdownEmailLoading] = useState(false);
  const [countdownEmailResult, setCountdownEmailResult] = useState<{ success: boolean; message: string } | null>(null);
  
  const isAndroid = typeof window !== "undefined" && /Android/i.test(navigator.userAgent);
  const notificationsSupported = typeof window !== "undefined" && "Notification" in window;

  // Handle notification toggle
  const handleNotificationToggle = async () => {
    setNotifLoading(true);
    try {
      if (isSubscribed) {
        await unsubscribe();
      } else {
        await subscribe();
      }
    } finally {
      setNotifLoading(false);
    }
  };

  // Send test notification
  const handleTestNotification = async () => {
    setTestLoading(true);
    setTestResult(null);
    
    try {
      const response = await fetch('/api/push/test', { method: 'POST' });
      const data = await response.json();
      
      setTestResult({
        success: data.success,
        message: data.message || data.error || 'Unknown result',
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to send',
      });
    } finally {
      setTestLoading(false);
      // Clear result after 5 seconds
      setTimeout(() => setTestResult(null), 5000);
    }
  };

  // Test delivery reminder cron
  const handleTestDeliveryReminder = async () => {
    setDeliveryReminderLoading(true);
    setDeliveryReminderResult(null);
    
    try {
      const response = await fetch('/api/cron/delivery-reminder', { method: 'POST' });
      const data = await response.json();
      
      setDeliveryReminderResult({
        success: data.success,
        message: data.message || data.error || 'Unknown result',
      });
    } catch (error) {
      setDeliveryReminderResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed',
      });
    } finally {
      setDeliveryReminderLoading(false);
      setTimeout(() => setDeliveryReminderResult(null), 5000);
    }
  };

  // Test follow-up email cron
  const handleTestFollowupEmails = async () => {
    setFollowupEmailLoading(true);
    setFollowupEmailResult(null);
    
    try {
      const response = await fetch('/api/cron/followup-emails', { method: 'POST' });
      const data = await response.json();
      
      setFollowupEmailResult({
        success: data.success,
        message: data.message || data.error || 'Unknown result',
      });
    } catch (error) {
      setFollowupEmailResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed',
      });
    } finally {
      setFollowupEmailLoading(false);
      setTimeout(() => setFollowupEmailResult(null), 5000);
    }
  };
  
  // Test countdown email cron
  const handleTestCountdownEmails = async () => {
    setCountdownEmailLoading(true);
    setCountdownEmailResult(null);
    
    try {
      const response = await fetch('/api/cron/event-countdown', { method: 'POST' });
      const data = await response.json();
      
      setCountdownEmailResult({
        success: data.success,
        message: data.message || data.error || 'Unknown result',
      });
    } catch (error) {
      setCountdownEmailResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed',
      });
    } finally {
      setCountdownEmailLoading(false);
      setTimeout(() => setCountdownEmailResult(null), 5000);
    }
  };

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

      {/* ================================================================== */}
      {/* PUSH NOTIFICATIONS - The Main Event */}
      {/* ================================================================== */}
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
            <p className="text-sm text-foreground/60">
              {isSubscribed ? "You'll receive alerts on this device" : "Enable to get instant alerts"}
            </p>
          </div>
        </div>

        {/* Not Supported */}
        {!notificationsSupported && (
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
        )}

        {/* Permission Denied */}
        {notificationsSupported && notificationPermission === "denied" && (
          <div className="rounded-lg bg-red-500/10 p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <div>
                <p className="text-sm font-medium text-red-400">Notifications Blocked</p>
                <p className="text-xs text-red-400/70">
                  Enable notifications in your browser settings to receive alerts
                </p>
              </div>
            </div>
          </div>
        )}

        {/* VAPID Not Configured */}
        {notificationsSupported && !vapidConfigured && (
          <div className="rounded-lg bg-amber-500/10 p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              <div>
                <p className="text-sm font-medium text-amber-400">Setup Required</p>
                <p className="text-xs text-amber-400/70">
                  Push notifications need to be configured on the server
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Service Worker Loading */}
        {notificationsSupported && vapidConfigured && swStatus === "loading" && (
          <div className="rounded-lg bg-white/5 p-4">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-foreground/50" />
              <p className="text-sm text-foreground/60">Setting up notifications...</p>
            </div>
          </div>
        )}

        {/* Ready State - Main Toggle */}
        {notificationsSupported && vapidConfigured && notificationPermission !== "denied" && swStatus === "ready" && (
          <div className="space-y-4">
            {/* Main Toggle Button */}
            <button
              onClick={handleNotificationToggle}
              disabled={notifLoading}
              className={`flex w-full items-center justify-between rounded-xl p-4 transition-all active:scale-[0.99] ${
                isSubscribed
                  ? "bg-green-500/10 border-2 border-green-500/30"
                  : "bg-white/5 border-2 border-white/10 hover:border-white/20"
              } ${notifLoading ? "opacity-60" : ""}`}
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-12 w-12 items-center justify-center rounded-full ${
                  isSubscribed ? "bg-green-500" : "bg-neutral-700"
                }`}>
                  {notifLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-white" />
                  ) : isSubscribed ? (
                    <Bell className="h-6 w-6 text-white" />
                  ) : (
                    <BellOff className="h-6 w-6 text-neutral-400" />
                  )}
                </div>
                <div className="text-left">
                  <p className={`font-semibold ${isSubscribed ? "text-green-400" : ""}`}>
                    {notifLoading ? "Please wait..." : isSubscribed ? "Notifications ON" : "Notifications OFF"}
                  </p>
                  <p className="text-xs text-foreground/50">
                    {isSubscribed ? "Tap to disable" : "Tap to enable"}
                  </p>
                </div>
              </div>
              
              <div className={`h-8 w-14 rounded-full p-1 transition-colors ${
                isSubscribed ? "bg-green-500" : "bg-neutral-600"
              }`}>
                <div className={`h-6 w-6 rounded-full bg-white shadow transition-transform ${
                  isSubscribed ? "translate-x-6" : "translate-x-0"
                }`} />
              </div>
            </button>

            {/* Test Notification Button - Only show when subscribed */}
            {isSubscribed && (
              <div className="space-y-3">
                <Button
                  onClick={handleTestNotification}
                  disabled={testLoading}
                  variant="outline"
                  className="w-full border-white/10 hover:bg-white/5"
                >
                  {testLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send Test Notification
                    </>
                  )}
                </Button>
                
                {testResult && (
                  <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                    testResult.success 
                      ? "bg-green-500/10 text-green-400" 
                      : "bg-red-500/10 text-red-400"
                  }`}>
                    {testResult.success ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                    )}
                    {testResult.message}
                  </div>
                )}
              </div>
            )}

            {/* What You'll Be Notified About */}
            <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-foreground/50">
                {isSubscribed ? "You'll be notified about:" : "When enabled, you'll get alerts for:"}
              </p>
              <div className="space-y-2">
                <NotificationTypeRow 
                  icon={PartyPopper} 
                  label="New bookings" 
                  description="Instant alert when someone books"
                  enabled={isSubscribed}
                />
                <NotificationTypeRow 
                  icon={CreditCard} 
                  label="Payments received" 
                  description="Know when deposits come in"
                  enabled={isSubscribed}
                />
                <NotificationTypeRow 
                  icon={XCircle} 
                  label="Cancellations" 
                  description="If a booking is cancelled"
                  enabled={isSubscribed}
                />
                <NotificationTypeRow 
                  icon={Truck} 
                  label="Tomorrow's deliveries" 
                  description="Evening reminder at 6 PM"
                  enabled={isSubscribed}
                />
              </div>
            </div>

            {/* Calendar Integration Note */}
            <div className="flex items-start gap-3 rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3">
              <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
              <div>
                <p className="text-sm font-medium text-cyan-300">Calendar Integration</p>
                <p className="text-xs text-cyan-300/70">
                  New booking notifications include an &quot;Add to Calendar&quot; option
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Debug Info - Only in development or for troubleshooting */}
        <details className="mt-4">
          <summary className="cursor-pointer text-xs text-foreground/30 hover:text-foreground/50">
            Debug info
          </summary>
          <div className="mt-2 rounded-lg bg-neutral-800/50 p-3 text-xs font-mono text-neutral-500">
            <p>SW Status: {swStatus}</p>
            <p>VAPID: {vapidConfigured ? "✓" : "✗"}</p>
            <p>Permission: {notificationPermission}</p>
            <p>Subscribed: {isSubscribed ? "✓" : "✗"}</p>
          </div>
        </details>
      </section>

      {/* ================================================================== */}
      {/* NOTIFICATION PREFERENCES - Customize what you receive */}
      {/* ================================================================== */}
      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-fuchsia-500/20">
            <Bell className="h-5 w-5 text-fuchsia-400" />
          </div>
          <div>
            <h2 className="font-semibold">Notification Preferences</h2>
            <p className="text-sm text-foreground/60">
              Customize which alerts you receive
            </p>
          </div>
        </div>
        
        <NotificationPreferencesEditor isSubscribed={isSubscribed} />
      </section>

      {/* ================================================================== */}
      {/* SOUND NOTIFICATIONS */}
      {/* ================================================================== */}
      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
            soundEnabled ? "bg-cyan-500/20" : "bg-neutral-500/20"
          }`}>
            {soundEnabled ? (
              <Volume2 className="h-5 w-5 text-cyan-400" />
            ) : (
              <VolumeX className="h-5 w-5 text-neutral-400" />
            )}
          </div>
          <div>
            <h2 className="font-semibold">Sound Notifications</h2>
            <p className="text-sm text-foreground/60">
              {soundEnabled ? "Play sound when new bookings arrive" : "Sound notifications are off"}
            </p>
          </div>
        </div>
        
        {/* Sound Toggle */}
        <button
          onClick={handleSoundToggle}
          className={`flex w-full items-center justify-between rounded-xl p-4 transition-all active:scale-[0.99] ${
            soundEnabled
              ? "bg-cyan-500/10 border-2 border-cyan-500/30"
              : "bg-white/5 border-2 border-white/10 hover:border-white/20"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`flex h-12 w-12 items-center justify-center rounded-full ${
              soundEnabled ? "bg-cyan-500" : "bg-neutral-700"
            }`}>
              {soundEnabled ? (
                <Volume2 className="h-6 w-6 text-white" />
              ) : (
                <VolumeX className="h-6 w-6 text-neutral-400" />
              )}
            </div>
            <div className="text-left">
              <p className={`font-semibold ${soundEnabled ? "text-cyan-400" : ""}`}>
                {soundEnabled ? "Sound ON" : "Sound OFF"}
              </p>
              <p className="text-xs text-foreground/50">
                {soundEnabled ? "Tap to disable" : "Tap to enable"}
              </p>
            </div>
          </div>
          
          <div className={`h-8 w-14 rounded-full p-1 transition-colors ${
            soundEnabled ? "bg-cyan-500" : "bg-neutral-600"
          }`}>
            <div className={`h-6 w-6 rounded-full bg-white shadow transition-transform ${
              soundEnabled ? "translate-x-6" : "translate-x-0"
            }`} />
          </div>
        </button>
        
        {/* Test Sound Button */}
        {soundEnabled && (
          <Button
            onClick={() => playNewBookingSound()}
            variant="outline"
            className="mt-4 w-full border-white/10 hover:bg-white/5"
          >
            <Volume2 className="mr-2 h-4 w-4" />
            Test Sound
          </Button>
        )}
        
        {/* Info */}
        <div className="mt-4 flex items-start gap-3 rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3">
          <Bell className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
          <div>
            <p className="text-sm font-medium text-cyan-300">Cha-ching! 💰</p>
            <p className="text-xs text-cyan-300/70">
              A pleasant sound plays when new bookings come in. The dashboard checks every 30 seconds.
            </p>
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

      {/* ================================================================== */}
      {/* AUTOMATED JOBS - Delivery Reminders & Follow-up Emails */}
      {/* ================================================================== */}
      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/20">
            <Clock className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <h2 className="font-semibold">Automated Jobs</h2>
            <p className="text-sm text-foreground/60">Daily tasks that run automatically</p>
          </div>
        </div>
        
        <div className="space-y-4">
          {/* Delivery Reminder */}
          <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-500/20">
                  <Truck className="h-5 w-5 text-cyan-400" />
                </div>
                <div>
                  <p className="font-medium">Delivery Reminders</p>
                  <p className="text-xs text-foreground/50">Push notification at 6 PM with tomorrow&apos;s schedule</p>
                  <p className="mt-1 text-xs text-foreground/30">Runs daily at 6:00 PM EST</p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleTestDeliveryReminder}
                disabled={deliveryReminderLoading}
                className="shrink-0 border-white/10"
              >
                {deliveryReminderLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <><Play className="mr-1.5 h-3 w-3" /> Run Now</>
                )}
              </Button>
            </div>
            {deliveryReminderResult && (
              <div className={`mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${
                deliveryReminderResult.success 
                  ? "bg-green-500/10 text-green-400" 
                  : "bg-red-500/10 text-red-400"
              }`}>
                {deliveryReminderResult.success ? (
                  <CheckCircle2 className="h-3 w-3 shrink-0" />
                ) : (
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                )}
                {deliveryReminderResult.message}
              </div>
            )}
          </div>

          {/* Countdown Emails */}
          <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/20">
                  <PartyPopper className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="font-medium">Event Countdown</p>
                  <p className="text-xs text-foreground/50">Sends "Your party is tomorrow!" email</p>
                  <p className="mt-1 text-xs text-foreground/30">Runs daily at 10:00 AM EST</p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleTestCountdownEmails}
                disabled={countdownEmailLoading}
                className="shrink-0 border-white/10"
              >
                {countdownEmailLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <><Play className="mr-1.5 h-3 w-3" /> Run Now</>
                )}
              </Button>
            </div>
            {countdownEmailResult && (
              <div className={`mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${
                countdownEmailResult.success 
                  ? "bg-green-500/10 text-green-400" 
                  : "bg-red-500/10 text-red-400"
              }`}>
                {countdownEmailResult.success ? (
                  <CheckCircle2 className="h-3 w-3 shrink-0" />
                ) : (
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                )}
                {countdownEmailResult.message}
              </div>
            )}
          </div>

          {/* Follow-up Emails */}
          <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-fuchsia-500/20">
                  <Mail className="h-5 w-5 text-fuchsia-400" />
                </div>
                <div>
                  <p className="font-medium">Follow-up Emails</p>
                  <p className="text-xs text-foreground/50">Sends review request 2 days after event</p>
                  <p className="mt-1 text-xs text-foreground/30">Runs daily at 10:00 AM EST</p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleTestFollowupEmails}
                disabled={followupEmailLoading}
                className="shrink-0 border-white/10"
              >
                {followupEmailLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <><Play className="mr-1.5 h-3 w-3" /> Run Now</>
                )}
              </Button>
            </div>
            {followupEmailResult && (
              <div className={`mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${
                followupEmailResult.success 
                  ? "bg-green-500/10 text-green-400" 
                  : "bg-red-500/10 text-red-400"
              }`}>
                {followupEmailResult.success ? (
                  <CheckCircle2 className="h-3 w-3 shrink-0" />
                ) : (
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                )}
                {followupEmailResult.message}
              </div>
            )}
          </div>

          {/* Info about automated jobs */}
          <div className="flex items-start gap-3 rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3">
            <Star className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
            <div>
              <p className="text-sm font-medium text-cyan-300">Fully Automated</p>
              <p className="text-xs text-cyan-300/70">
                These jobs run automatically via Vercel Cron. Use &quot;Run Now&quot; to test or trigger manually.
              </p>
            </div>
          </div>
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

// =============================================================================
// NOTIFICATION TYPE ROW COMPONENT
// =============================================================================

function NotificationTypeRow({ 
  icon: Icon, 
  label, 
  description, 
  enabled,
  comingSoon,
}: { 
  icon: React.ElementType;
  label: string;
  description: string;
  enabled: boolean;
  comingSoon?: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 ${comingSoon ? "opacity-50" : ""}`}>
      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
        enabled && !comingSoon ? "bg-green-500/20" : "bg-white/5"
      }`}>
        <Icon className={`h-4 w-4 ${
          enabled && !comingSoon ? "text-green-400" : "text-foreground/40"
        }`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">
          {label}
          {comingSoon && (
            <span className="ml-2 text-xs text-foreground/40">(coming soon)</span>
          )}
        </p>
        <p className="text-xs text-foreground/50">{description}</p>
      </div>
      {enabled && !comingSoon && (
        <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
      )}
    </div>
  );
}
