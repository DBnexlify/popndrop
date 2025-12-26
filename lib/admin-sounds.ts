// =============================================================================
// ADMIN NOTIFICATION SOUNDS
// lib/admin-sounds.ts
// Audio notifications for new bookings
// =============================================================================

// Cache the audio element for reuse
let notificationAudio: HTMLAudioElement | null = null;

/**
 * Get or create the notification audio element (lazy initialization)
 */
function getNotificationAudio(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;
  
  if (!notificationAudio) {
    try {
      notificationAudio = new Audio('/booking-confirmed.mp3');
      notificationAudio.preload = 'auto';
    } catch (e) {
      console.warn('Failed to create audio element:', e);
      return null;
    }
  }
  
  return notificationAudio;
}

/**
 * Check if audio is enabled in localStorage
 */
export function isAudioEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('admin-sound-enabled') !== 'false';
}

/**
 * Set audio enabled state
 */
export function setAudioEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('admin-sound-enabled', enabled ? 'true' : 'false');
}

/**
 * Play the booking notification sound
 */
export function playNewBookingSound(): void {
  if (!isAudioEnabled()) return;
  
  const audio = getNotificationAudio();
  if (!audio) return;
  
  try {
    // Reset to beginning if already playing
    audio.currentTime = 0;
    
    // Play the sound
    const playPromise = audio.play();
    
    // Handle autoplay restrictions gracefully
    if (playPromise !== undefined) {
      playPromise.catch((e) => {
        // Autoplay was prevented - this is expected on first load
        // Sound will work after user interacts with the page
        console.log('Audio autoplay prevented - will work after user interaction');
      });
    }
  } catch (e) {
    console.warn('Failed to play sound:', e);
  }
}

/**
 * Play a subtle notification sound (same as booking sound for consistency)
 */
export function playNotificationSound(): void {
  playNewBookingSound();
}

/**
 * Play a success/celebration sound (same as booking sound for consistency)
 */
export function playSuccessSound(): void {
  playNewBookingSound();
}

/**
 * Test sound playback (for settings page)
 */
export function testSound(): void {
  // Temporarily enable to test
  const wasEnabled = isAudioEnabled();
  setAudioEnabled(true);
  playNewBookingSound();
  if (!wasEnabled) {
    // Restore state after a delay
    setTimeout(() => setAudioEnabled(false), 1000);
  }
}
