declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext
  }
}

// Web Audio API synthesizer for 100% offline sound effects
class SoundController {
  private ctx: AudioContext | null = null
  private isMuted: boolean = false
  private resumePromise: Promise<void> | null = null
  private tickThrottleMs: number = 28

  constructor() {
    // AudioContext will be initialized on first user interaction
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (!AudioCtx) return null
      try {
        this.ctx = new AudioCtx({ latencyHint: 'interactive' })
      } catch {
        return null
      }
    }

    // `resume()` on a context that is already running still allocates a promise,
    // and the wheel calls this ~30x/second while ticking. Only resume when the
    // context is genuinely suspended, and share one in-flight resume attempt.
    if (this.ctx.state === 'suspended' && !this.resumePromise) {
      this.resumePromise = this.ctx
        .resume()
        .catch(() => {})
        .then(() => {
          this.resumePromise = null
        })
    }

    return this.ctx
  }

  /**
   * Minimum milliseconds between tick sounds. Lower-end profiles raise this so
   * cheap machines create fewer oscillator nodes per spin.
   */
  public setTickThrottleMs(ms: number) {
    this.tickThrottleMs = Math.max(0, ms)
  }

  public getTickThrottleMs(): number {
    return this.tickThrottleMs
  }

  /** Call from a user gesture so the context is unlocked before the wheel spins. */
  public unlock() {
    if (this.isMuted) return
    const ctx = this.getContext()
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted
  }

  public getMuted(): boolean {
    return this.isMuted
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted
    return this.isMuted
  }

  // Whoosh sound when the wheel is launched
  public playSpinStart() {
    if (this.isMuted) return
    const ctx = this.getContext()
    if (!ctx) return

    try {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(150, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(450, ctx.currentTime + 0.35)

      gain.gain.setValueAtTime(0.01, ctx.currentTime)
      gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.15)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start()
      osc.stop(ctx.currentTime + 0.45)
    } catch {
      // Audio error ignored safely
    }
  }

  // Heavy mechanical clack for the suspenseful crawl phase
  public playCreepClack() {
    if (this.isMuted) return
    const ctx = this.getContext()
    if (!ctx) return

    try {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'triangle'
      osc.frequency.setValueAtTime(520, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(90, ctx.currentTime + 0.055)

      gain.gain.setValueAtTime(0.45, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.055)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start()
      osc.stop(ctx.currentTime + 0.06)
    } catch {
      // Audio error ignored safely
    }
  }

  // Mechanical tick sound when the wheel pointer hits a peg during fast/medium spin
  public playTick(pitchFactor: number = 1.0) {
    if (this.isMuted) return
    const ctx = this.getContext()
    if (!ctx) return

    try {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      // High crisp click sound for fast spinning
      osc.type = 'triangle'
      const freq = 650 * Math.max(0.6, Math.min(1.8, pitchFactor))
      osc.frequency.setValueAtTime(freq, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.028)

      gain.gain.setValueAtTime(0.25, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.028)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start()
      osc.stop(ctx.currentTime + 0.032)
    } catch {
      // Audio error ignored safely
    }
  }

  // Triumphant fanfare chords when a winner is chosen
  public playWinnerFanfare() {
    if (this.isMuted) return
    const ctx = this.getContext()
    if (!ctx) return

    try {
      const notes = [523.25, 659.25, 783.99, 1046.50] // C5, E5, G5, C6 major chord arpeggio
      notes.forEach((freq, index) => {
        const startTime = ctx.currentTime + index * 0.12
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, startTime)

        gain.gain.setValueAtTime(0, startTime)
        gain.gain.linearRampToValueAtTime(0.35, startTime + 0.03)
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.6)

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start(startTime)
        osc.stop(startTime + 0.65)
      })

      // Final celebratory chime chord
      const chordTime = ctx.currentTime + 0.52
      const chordNotes = [523.25, 659.25, 783.99, 1046.50, 1318.51] // C Major with high E
      chordNotes.forEach(freq => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        osc.type = 'triangle'
        osc.frequency.setValueAtTime(freq, chordTime)

        gain.gain.setValueAtTime(0.2, chordTime)
        gain.gain.exponentialRampToValueAtTime(0.001, chordTime + 1.2)

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start(chordTime)
        osc.stop(chordTime + 1.25)
      })
    } catch {
      // Audio error ignored safely
    }
  }
}

export const soundManager = new SoundController()
