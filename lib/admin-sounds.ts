// =============================================================================
// ADMIN NOTIFICATION SOUNDS
// lib/admin-sounds.ts
// Audio notifications for new bookings using Web Audio API
// No external sound files needed!
// =============================================================================

let audioContext: AudioContext | null = null;

/**
 * Get or create AudioContext (lazy initialization)
 */
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.warn('Web Audio API not supported:', e);
      return null;
    }
  }
  
  // Resume if suspended (autoplay policy)
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  
  return audioContext;
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
 * Play a "cha-ching" cash register style sound for new bookings
 * Creates a pleasant two-tone notification
 */
export function playNewBookingSound(): void {
  if (!isAudioEnabled()) return;
  
  const ctx = getAudioContext();
  if (!ctx) return;
  
  try {
    const now = ctx.currentTime;
    
    // Create a pleasant two-note "ding-ding" sound
    const frequencies = [880, 1108.73]; // A5 and C#6 (major third)
    
    frequencies.forEach((freq, i) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.value = freq;
      
      // Envelope: quick attack, medium decay
      const startTime = now + (i * 0.12);
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + 0.5);
    });
    
    // Add a subtle "sparkle" overtone
    const sparkle = ctx.createOscillator();
    const sparkleGain = ctx.createGain();
    
    sparkle.connect(sparkleGain);
    sparkleGain.connect(ctx.destination);
    
    sparkle.type = 'sine';
    sparkle.frequency.value = 2217.46; // C#7
    
    sparkleGain.gain.setValueAtTime(0, now + 0.15);
    sparkleGain.gain.linearRampToValueAtTime(0.1, now + 0.17);
    sparkleGain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    
    sparkle.start(now + 0.15);
    sparkle.stop(now + 0.6);
    
  } catch (e) {
    console.warn('Failed to play sound:', e);
  }
}

/**
 * Play a subtle notification sound
 */
export function playNotificationSound(): void {
  if (!isAudioEnabled()) return;
  
  const ctx = getAudioContext();
  if (!ctx) return;
  
  try {
    const now = ctx.currentTime;
    
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.value = 660; // E5
    
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.2, now + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    
    oscillator.start(now);
    oscillator.stop(now + 0.4);
    
  } catch (e) {
    console.warn('Failed to play sound:', e);
  }
}

/**
 * Play a success/celebration sound
 */
export function playSuccessSound(): void {
  if (!isAudioEnabled()) return;
  
  const ctx = getAudioContext();
  if (!ctx) return;
  
  try {
    const now = ctx.currentTime;
    
    // Ascending arpeggio: C5 -> E5 -> G5 -> C6
    const frequencies = [523.25, 659.25, 783.99, 1046.50];
    
    frequencies.forEach((freq, i) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.value = freq;
      
      const startTime = now + (i * 0.08);
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.2, startTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + 0.4);
    });
    
  } catch (e) {
    console.warn('Failed to play sound:', e);
  }
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
