/**
 * SoundManager — Web Audio API beep for barcode scan feedback.
 *
 * Key design decisions:
 * - Uses Web Audio API (no external audio files, works offline, ~10ms latency).
 * - Must be initialized from a user gesture (click/tap) to comply with browser autoplay policies.
 * - Preference persisted in localStorage.
 * - Provides both beep and vibration feedback.
 */

class SoundManagerClass {
  private audioCtx: AudioContext | null = null;
  private _isEnabled = true;

  get isEnabled(): boolean {
    return this._isEnabled;
  }

  set isEnabled(val: boolean) {
    this._isEnabled = val;
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      localStorage.setItem("smartshop_sound_enabled", String(val));
    }
  }

  /**
   * Initialize the AudioContext.
   * MUST be called from a user gesture (click/tap) on iOS/Android/Chrome
   * to avoid autoplay policy blocking.
   */
  init(): void {
    if (typeof window === "undefined") return;
    if (this.audioCtx) return;

    const AudioContext =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;

    if (!AudioContext) return;

    try {
      this.audioCtx = new AudioContext();
      if (this.audioCtx.state === "suspended") {
        this.audioCtx.resume();
      }
    } catch {
      // Audio not supported
    }

    this.restoreFromStorage();
  }

  /**
   * Restore the user's sound preference from localStorage.
   */
  restoreFromStorage(): void {
    if (typeof window === "undefined" || typeof localStorage === "undefined") return;
    const stored = localStorage.getItem("smartshop_sound_enabled");
    if (stored !== null) {
      this._isEnabled = stored === "true";
    }
  }

  /**
   * Play a short beep sound.
   *
   * @param frequency - Tone frequency in Hz (default 1200 = clear, pleasant beep)
   * @param duration - Duration in seconds (default 0.12s = quick tick)
   * @param volume - Gain 0–1 (default 0.2 = moderate)
   */
  playBeep(
    frequency: number = 1200,
    duration: number = 0.12,
    volume: number = 0.2
  ): void {
    if (!this._isEnabled || !this.audioCtx) return;

    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(frequency, this.audioCtx.currentTime);

      // Envelope: ramp down to avoid click artifacts at start/end
      gain.gain.setValueAtTime(volume, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        this.audioCtx.currentTime + duration
      );

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch {
      // Silently fail if audio context is in a bad state
    }
  }

  /**
   * Play a success beep (higher pitch, pleasant confirmation).
   */
  playSuccess(): void {
    this.playBeep(1200, 0.12, 0.25);
  }

  /**
   * Play a warning beep (lower pitch, attention-grabbing).
   */
  playWarning(): void {
    this.playBeep(600, 0.2, 0.2);
  }

  /**
   * Trigger device vibration (haptic feedback).
   * No-op if not supported by the device/browser.
   */
  vibrate(pattern: number | number[] = 50): void {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  }
}

/** Singleton SoundManager instance */
export const soundManager = new SoundManagerClass();
export default soundManager;
