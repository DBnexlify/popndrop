// =============================================================================
// HAPTIC FEEDBACK UTILITY
// lib/haptics.ts
// Provides tactile feedback for micro-interactions on supported devices
// =============================================================================

type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';

interface HapticOptions {
  pattern: HapticPattern;
  fallbackVibration?: number | number[];
}

// Pattern definitions for different feedback types
const HAPTIC_PATTERNS: Record<HapticPattern, number | number[]> = {
  // Single taps
  light: 10,           // Subtle tap - selections, hovers
  medium: 25,          // Standard tap - button presses
  heavy: 50,           // Strong tap - important actions
  
  // Complex patterns
  success: [10, 50, 10, 50, 30],  // Two quick taps + longer pulse
  warning: [30, 100, 30],         // Two medium pulses
  error: [50, 100, 50, 100, 50],  // Three strong pulses
  selection: [5, 30, 5],          // Quick double-tap feel
};

/**
 * Trigger haptic feedback if supported by the device
 * Uses the Vibration API with graceful fallback
 */
export function haptic(pattern: HapticPattern = 'medium'): void {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') return;
  
  // Check if vibration is supported
  if (!('vibrate' in navigator)) return;
  
  try {
    const vibrationPattern = HAPTIC_PATTERNS[pattern];
    navigator.vibrate(vibrationPattern);
  } catch (e) {
    // Silently fail - haptics are enhancement, not critical
    console.debug('[Haptics] Vibration failed:', e);
  }
}

/**
 * Trigger haptic feedback for a successful action
 * Two quick taps followed by a satisfying pulse
 */
export function hapticSuccess(): void {
  haptic('success');
}

/**
 * Trigger haptic feedback for selection/tap
 * Quick, subtle feedback
 */
export function hapticSelect(): void {
  haptic('selection');
}

/**
 * Trigger haptic feedback for navigation
 * Medium tap to confirm movement
 */
export function hapticNavigate(): void {
  haptic('medium');
}

/**
 * Trigger haptic feedback for errors/warnings
 */
export function hapticError(): void {
  haptic('error');
}

/**
 * Trigger haptic feedback for important confirmations
 */
export function hapticConfirm(): void {
  haptic('heavy');
}

/**
 * Check if haptic feedback is available on this device
 */
export function isHapticSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'vibrate' in navigator;
}
