// =============================================================================
// ADMIN NOTIFICATION SOUNDS
// lib/admin-sounds.ts
// Audio notifications for new bookings using Web Audio API
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
 * Create white noise buffer for mechanical "cha" sound
 */
function createNoiseBuffer(ctx: AudioContext, duration: number): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = sampleRate * duration;
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  
  return buffer;
}

/**
 * Play a realistic "cha-ching" cash register sound for new bookings
 * Combines mechanical drawer sound with bell/coin sounds
 */
export function playNewBookingSound(): void {
  if (!isAudioEnabled()) return;
  
  const ctx = getAudioContext();
  if (!ctx) return;
  
  try {
    const now = ctx.currentTime;
    
    // =========================================================================
    // PART 1: "CHA" - Mechanical drawer/lever sound (filtered noise burst)
    // =========================================================================
    const noiseBuffer = createNoiseBuffer(ctx, 0.15);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    
    // Bandpass filter for mechanical click
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 1000;
    noiseFilter.Q.value = 1;
    
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.4, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    
    noise.start(now);
    noise.stop(now + 0.15);
    
    // =========================================================================
    // PART 2: "CHING" - Bell/coin sound (multiple harmonics)
    // =========================================================================
    const bellFrequencies = [
      { freq: 1567.98, gain: 0.35, decay: 0.8 },   // G6 - fundamental
      { freq: 2093.00, gain: 0.25, decay: 0.6 },   // C7 - bright overtone
      { freq: 2349.32, gain: 0.15, decay: 0.5 },   // D7 - shimmer
      { freq: 3135.96, gain: 0.1, decay: 0.4 },    // G7 - sparkle
    ];
    
    const bellStart = now + 0.08; // Slight delay after "cha"
    
    bellFrequencies.forEach(({ freq, gain, decay }) => {
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      
      osc.connect(oscGain);
      oscGain.connect(ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.value = freq;
      
      // Bell-like envelope: instant attack, slow decay
      oscGain.gain.setValueAtTime(gain, bellStart);
      oscGain.gain.exponentialRampToValueAtTime(0.001, bellStart + decay);
      
      osc.start(bellStart);
      osc.stop(bellStart + decay + 0.1);
    });
    
    // =========================================================================
    // PART 3: Second "CHING" - Coin drop (slightly lower, delayed)
    // =========================================================================
    const coinFrequencies = [
      { freq: 1318.51, gain: 0.3, decay: 0.7 },   // E6
      { freq: 1760.00, gain: 0.2, decay: 0.5 },   // A6
      { freq: 2217.46, gain: 0.12, decay: 0.4 },  // C#7
    ];
    
    const coinStart = now + 0.22; // After the first ching
    
    coinFrequencies.forEach(({ freq, gain, decay }) => {
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      
      osc.connect(oscGain);
      oscGain.connect(ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.value = freq;
      
      oscGain.gain.setValueAtTime(gain, coinStart);
      oscGain.gain.exponentialRampToValueAtTime(0.001, coinStart + decay);
      
      osc.start(coinStart);
      osc.stop(coinStart + decay + 0.1);
    });
    
    // =========================================================================
    // PART 4: Subtle metallic shimmer (very high frequency, quiet)
    // =========================================================================
    const shimmer = ctx.createOscillator();
    const shimmerGain = ctx.createGain();
    
    shimmer.connect(shimmerGain);
    shimmerGain.connect(ctx.destination);
    
    shimmer.type = 'sine';
    shimmer.frequency.value = 4186.01; // C8
    
    shimmerGain.gain.setValueAtTime(0, bellStart);
    shimmerGain.gain.linearRampToValueAtTime(0.08, bellStart + 0.02);
    shimmerGain.gain.exponentialRampToValueAtTime(0.001, bellStart + 0.35);
    
    shimmer.start(bellStart);
    shimmer.stop(bellStart + 0.4);
    
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
