// =============================================================================
// NOTIFICATION PREFERENCES COMPONENT
// components/admin/notification-preferences.tsx
// Full notification preference management UI
// =============================================================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  BellOff,
  Clock,
  Calendar,
  CreditCard,
  Truck,
  Package,
  XCircle,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Moon,
  Sun,
  Zap,
  Mail,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { format24To12Hour } from '@/lib/timezone';
import {
  type NotificationPreferences,
  type NotificationMode,
  type NotificationType,
  NOTIFICATION_CATEGORIES,
  MODE_DESCRIPTIONS,
  DEFAULT_PREFERENCES,
} from '@/lib/notification-preferences-types';

// =============================================================================
// TYPES
// =============================================================================

interface NotificationPreferencesProps {
  isSubscribed: boolean;
}

// =============================================================================
// ICON MAPPING
// =============================================================================

const categoryIcons: Record<string, React.ElementType> = {
  booking: Calendar,
  payment: CreditCard,
  operational: Truck,
  summary: Mail,
};

const typeIcons: Record<NotificationType, React.ElementType> = {
  new_booking: Bell,
  booking_cancelled: XCircle,
  booking_modified: RefreshCw,
  payment_deposit: CreditCard,
  payment_full: CheckCircle2,
  payment_failed: AlertTriangle,
  refund_requested: RefreshCw,
  refund_completed: CheckCircle2,
  delivery_prompt: Truck,
  pickup_prompt: Package,
  balance_reminder: CreditCard,
  auto_complete_notice: CheckCircle2,
  daily_summary: Mail,
};

// =============================================================================
// TOGGLE SWITCH COMPONENT
// =============================================================================

function ToggleSwitch({
  checked,
  onChange,
  disabled,
  size = 'default',
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'default' | 'small';
}) {
  const isSmall = size === 'small';
  
  // Explicit pixel dimensions to prevent mobile CSS issues
  // Default: 48x28px track, 24x24px thumb
  // Small: 40x24px track, 20x20px thumb
  const trackWidth = isSmall ? 40 : 48;
  const trackHeight = isSmall ? 24 : 28;
  const thumbSize = isSmall ? 20 : 24;
  const thumbOffset = (trackHeight - thumbSize) / 2;
  const thumbTravel = trackWidth - thumbSize - 4; // 4px for edge padding
  
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "shrink-0 cursor-pointer rounded-full transition-colors duration-200",
        checked
          ? "bg-gradient-to-r from-green-500 to-green-600"
          : "bg-white/10",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      style={{ 
        width: `${trackWidth}px`, 
        height: `${trackHeight}px`,
        minWidth: `${trackWidth}px`,
      }}
    >
      <div
        className="rounded-full bg-white shadow-lg transition-transform duration-200"
        style={{
          width: `${thumbSize}px`,
          height: `${thumbSize}px`,
          marginTop: `${thumbOffset}px`,
          transform: checked ? `translateX(${thumbTravel}px)` : 'translateX(2px)',
        }}
      />
    </button>
  );
}

// =============================================================================
// MODE SELECTOR COMPONENT
// =============================================================================

function ModeSelector({
  mode,
  onChange,
  disabled,
}: {
  mode: NotificationMode;
  onChange: (mode: NotificationMode) => void;
  disabled?: boolean;
}) {
  const modes: NotificationMode[] = ['realtime', 'digest', 'custom'];
  
  const modeIcons: Record<NotificationMode, React.ElementType> = {
    realtime: Zap,
    digest: Mail,
    custom: Bell,
  };

  return (
    <div className="grid grid-cols-3 gap-2">
      {modes.map((m) => {
        const Icon = modeIcons[m];
        const isActive = mode === m;
        const info = MODE_DESCRIPTIONS[m];
        
        return (
          <button
            key={m}
            type="button"
            disabled={disabled}
            onClick={() => onChange(m)}
            className={cn(
              "relative flex flex-col items-center gap-1.5 rounded-xl p-3 transition-all",
              "border-2",
              isActive
                ? "border-fuchsia-500/50 bg-fuchsia-500/10"
                : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full",
              isActive ? "bg-fuchsia-500/20" : "bg-white/5"
            )}>
              <Icon className={cn(
                "h-5 w-5",
                isActive ? "text-fuchsia-400" : "text-foreground/50"
              )} />
            </div>
            <span className={cn(
              "text-xs font-medium",
              isActive ? "text-fuchsia-300" : "text-foreground/70"
            )}>
              {info.label}
            </span>
            {isActive && (
              <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-fuchsia-500" />
            )}
          </button>
        );
      })}
    </div>
  );
}

// =============================================================================
// CATEGORY SECTION COMPONENT
// =============================================================================

function CategorySection({
  category,
  preferences,
  onChange,
  disabled,
  expanded,
  onToggleExpand,
}: {
  category: typeof NOTIFICATION_CATEGORIES[0];
  preferences: Partial<NotificationPreferences>;
  onChange: (key: NotificationType, value: boolean) => void;
  disabled?: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const Icon = categoryIcons[category.id] || Bell;
  
  // Count enabled notifications in this category
  const enabledCount = category.types.filter(
    (t) => preferences[t.key as keyof typeof preferences] === true
  ).length;
  
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
      {/* Header - clickable to expand/collapse */}
      <button
        type="button"
        onClick={onToggleExpand}
        className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-white/[0.02]"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5">
            <Icon className="h-5 w-5 text-foreground/60" />
          </div>
          <div>
            <p className="font-medium">{category.label}</p>
            <p className="text-xs text-foreground/50">{category.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-foreground/40">
            {enabledCount}/{category.types.length} enabled
          </span>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-foreground/40" />
          ) : (
            <ChevronDown className="h-4 w-4 text-foreground/40" />
          )}
        </div>
      </button>
      
      {/* Expandable content */}
      {expanded && (
        <div className="border-t border-white/5 p-4 space-y-3">
          {category.types.map((type) => {
            const TypeIcon = typeIcons[type.key] || Bell;
            const isEnabled = preferences[type.key as keyof typeof preferences] === true;
            
            return (
              <div
                key={type.key}
                className="flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                    isEnabled ? "bg-green-500/10" : "bg-white/5"
                  )}>
                    <TypeIcon className={cn(
                      "h-4 w-4",
                      isEnabled ? "text-green-400" : "text-foreground/40"
                    )} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium flex items-center gap-2">
                      {type.label}
                      {type.urgent && (
                        <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
                          URGENT
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-foreground/50 truncate">
                      {type.description}
                    </p>
                  </div>
                </div>
                <ToggleSwitch
                  checked={isEnabled}
                  onChange={(v) => onChange(type.key, v)}
                  disabled={disabled}
                  size="small"
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function NotificationPreferencesEditor({
  isSubscribed,
}: NotificationPreferencesProps) {
  const [preferences, setPreferences] = useState<Partial<NotificationPreferences>>(
    DEFAULT_PREFERENCES
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Fetch preferences on mount
  const fetchPreferences = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/admin/preferences');
      if (!response.ok) throw new Error('Failed to fetch preferences');
      
      const data = await response.json();
      setPreferences(data.preferences);
    } catch (err) {
      console.error('Error fetching preferences:', err);
      setError('Failed to load preferences');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  // Save preferences
  const savePreferences = async (updates: Partial<NotificationPreferences>) => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);
      
      const response = await fetch('/api/admin/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) throw new Error('Failed to save preferences');
      
      const data = await response.json();
      setPreferences(data.preferences);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      console.error('Error saving preferences:', err);
      setError('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  // Handle mode change
  const handleModeChange = (mode: NotificationMode) => {
    setPreferences((prev) => ({ ...prev, mode }));
    savePreferences({ mode });
  };

  // Handle individual toggle change
  const handleToggleChange = (key: NotificationType, value: boolean) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
    savePreferences({ [key]: value });
  };

  // Handle quiet hours toggle
  const handleQuietHoursChange = (enabled: boolean) => {
    setPreferences((prev) => ({ ...prev, quiet_hours_enabled: enabled }));
    savePreferences({ quiet_hours_enabled: enabled });
  };

  // Toggle category expansion
  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-foreground/30" />
      </div>
    );
  }

  // Not subscribed state
  if (!isSubscribed) {
    return (
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-6 text-center">
        <BellOff className="mx-auto mb-3 h-10 w-10 text-amber-400" />
        <p className="font-medium text-amber-300">Push Notifications Disabled</p>
        <p className="mt-1 text-sm text-amber-300/70">
          Enable push notifications above to customize what you receive.
        </p>
      </div>
    );
  }

  const currentMode = preferences.mode || 'realtime';
  const showCustomToggles = currentMode === 'custom';

  return (
    <div className="space-y-6">
      {/* Error/Success Messages */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-lg bg-green-500/10 px-4 py-3 text-sm text-green-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Preferences saved!
        </div>
      )}

      {/* Mode Selector */}
      <div>
        <label className="mb-3 block text-sm font-medium">Notification Mode</label>
        <ModeSelector
          mode={currentMode}
          onChange={handleModeChange}
          disabled={saving}
        />
        <p className="mt-2 text-xs text-foreground/50">
          {MODE_DESCRIPTIONS[currentMode].description}
        </p>
      </div>

      {/* Digest Mode Info */}
      {currentMode === 'digest' && (
        <div className="flex items-start gap-3 rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-4">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
          <div>
            <p className="text-sm font-medium text-cyan-300">Digest Mode Active</p>
            <p className="mt-1 text-xs text-cyan-300/70">
              You'll receive a daily summary at{' '}
              <strong>{format24To12Hour(preferences.daily_summary_time || '07:00:00')} ET</strong>.
              Only urgent alerts (payment failures, cancellations) will interrupt in real-time.
            </p>
          </div>
        </div>
      )}

      {/* Custom Toggles */}
      {showCustomToggles && (
        <div className="space-y-3">
          <label className="block text-sm font-medium">Notification Types</label>
          {NOTIFICATION_CATEGORIES.map((category) => (
            <CategorySection
              key={category.id}
              category={category}
              preferences={preferences}
              onChange={handleToggleChange}
              disabled={saving}
              expanded={expandedCategories.has(category.id)}
              onToggleExpand={() => toggleCategory(category.id)}
            />
          ))}
        </div>
      )}

      {/* Quiet Hours */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/10">
              <Moon className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <p className="font-medium">Quiet Hours</p>
              <p className="text-xs text-foreground/50">
                Silence non-urgent notifications at night
              </p>
            </div>
          </div>
          <ToggleSwitch
            checked={preferences.quiet_hours_enabled || false}
            onChange={handleQuietHoursChange}
            disabled={saving}
          />
        </div>
        
        {preferences.quiet_hours_enabled && (
          <div className="mt-4 flex items-center gap-4 rounded-lg bg-white/[0.02] p-3">
            <div className="flex items-center gap-2">
              <Moon className="h-4 w-4 text-foreground/40" />
              <span className="text-sm text-foreground/70">
                {format24To12Hour(preferences.quiet_hours_start || '22:00:00')}
              </span>
            </div>
            <span className="text-foreground/30">→</span>
            <div className="flex items-center gap-2">
              <Sun className="h-4 w-4 text-foreground/40" />
              <span className="text-sm text-foreground/70">
                {format24To12Hour(preferences.quiet_hours_end || '07:00:00')}
              </span>
            </div>
            <span className="ml-auto text-xs text-foreground/40">ET</span>
          </div>
        )}
      </div>

      {/* Saving indicator */}
      {saving && (
        <div className="flex items-center justify-center gap-2 text-sm text-foreground/50">
          <Loader2 className="h-4 w-4 animate-spin" />
          Saving...
        </div>
      )}
    </div>
  );
}
