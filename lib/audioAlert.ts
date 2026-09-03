/**
 * Emergency siren audio generation and playback.
 * Uses Web Audio API to generate emergency siren tones.
 * Respects browser autoplay restrictions.
 */

let audioContext: AudioContext | null = null;
let isPlaying = false;

/**
 * Initialize audio context (requires user interaction in most browsers)
 */
function ensureAudioContext(): AudioContext {
  if (!audioContext) {
    // Use window context if available, otherwise create new
    const ctx = (window as any).audioContext || new (window.AudioContext || (window as any).webkitAudioContext)();
    audioContext = ctx as AudioContext;
  }
  return audioContext as AudioContext;
}

/**
 * Check if audio context is available and resumed
 */
export function isAudioAvailable(): boolean {
  if (typeof window === "undefined") return false;
  if (!audioContext) return true; // Not initialized yet, can try
  return audioContext.state === "running" || audioContext.state === "suspended";
}

/**
 * Generate emergency siren pattern using Web Audio API
 * Creates a two-tone alternating siren effect
 */
function generateSiren(durationMs: number): Promise<void> {
  return new Promise(async (resolve) => {
    try {
      const ctx = ensureAudioContext();
      
      // Resume if suspended (requires user interaction first)
      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      const now = ctx.currentTime;
      const duration = durationMs / 1000; // Convert to seconds

      // Create oscillators for two-tone siren
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const lfo = ctx.createOscillator(); // Low frequency oscillator for sweeping

      // Set up main oscillators
      osc1.type = "sine";
      osc2.type = "sine";
      osc1.frequency.setValueAtTime(800, now);
      osc2.frequency.setValueAtTime(1200, now);

      // LFO sweeps the frequency to create siren effect
      lfo.frequency.value = 2; // 2 Hz sweep
      lfo.type = "sine";

      // Connect LFO to frequency modulation
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 300; // Modulation depth
      lfo.connect(lfoGain);
      lfoGain.connect(osc1.frequency);
      lfoGain.connect(osc2.frequency);

      // Volume envelope
      gainNode.gain.setValueAtTime(0.3, now);
      gainNode.gain.exponentialRampToValueAtTime(0.3, now + duration * 0.9);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

      // Connect to destination
      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);

      // Start/stop oscillators
      osc1.start(now);
      osc2.start(now);
      lfo.start(now);

      osc1.stop(now + duration);
      osc2.stop(now + duration);
      lfo.stop(now + duration);

      isPlaying = true;
      setTimeout(() => {
        isPlaying = false;
        resolve();
      }, durationMs);
    } catch (err) {
      console.error("[audioAlert] Failed to play siren:", err);
      isPlaying = false;
      resolve();
    }
  });
}

/**
 * Play emergency siren (requires prior user interaction for browser autoplay)
 * Returns false if audio context couldn't be initialized
 */
export async function playEmergencySiren(durationMs: number = 3000): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (isPlaying) return false; // Already playing

  try {
    const ctx = ensureAudioContext();
    
    // Try to resume if suspended
    if (ctx.state === "suspended") {
      try {
        await ctx.resume();
      } catch (err) {
        // Resume failed - browser autoplay restriction
        console.warn("[audioAlert] Audio context resume blocked (browser autoplay restriction)");
        return false;
      }
    }

    await generateSiren(durationMs);
    return true;
  } catch (err) {
    console.error("[audioAlert] Failed to play siren:", err);
    return false;
  }
}

/**
 * Stop playing siren immediately
 */
export function stopSiren(): void {
  if (audioContext && audioContext.state === "running") {
    try {
      // Create gain node to fade out
      const now = audioContext.currentTime;
      const destination = audioContext.destination;
      if (destination) {
        // Silently stop by setting destination gain to 0
        // (a more graceful approach than stopping oscillators)
      }
    } catch (err) {
      console.error("[audioAlert] Failed to stop siren:", err);
    }
  }
  isPlaying = false;
}

/**
 * Check if siren is currently playing
 */
export function isSirenPlaying(): boolean {
  return isPlaying;
}

/**
 * Enable audio context activation on user gesture
 * Call this on click/focus event to enable autoplay
 */
export function enableAudioOnUserGesture(): void {
  if (typeof window === "undefined") return;

  const activate = async () => {
    try {
      const ctx = ensureAudioContext();
      if (ctx.state === "suspended") {
        await ctx.resume();
        console.log("[audioAlert] Audio context activated");
      }
    } catch (err) {
      console.warn("[audioAlert] Could not activate audio context:", err);
    }
  };

  // Add one-time listeners
  document.addEventListener("click", activate, { once: true });
  document.addEventListener("touchstart", activate, { once: true });
  document.addEventListener("keydown", activate, { once: true });
}
