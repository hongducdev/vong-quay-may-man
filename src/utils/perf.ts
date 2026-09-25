/**
 * Device capability detection + quality profiles.
 *
 * Goal: keep the wheel animation smooth and the app stable on low-end Windows
 * machines that have no discrete GPU (integrated Intel HD / old AMD APU,
 * software rasterization, 2-4 logical cores, 4 GB RAM or less).
 *
 * The two dominant costs on such machines are:
 *   1. The number of device pixels we touch per frame  -> controlled by `dprCap`
 *   2. Expensive per-pixel effects (shadowBlur / backdrop-filter) -> `shadows`, `backdropBlur`
 * Everything else (frame rate, particle counts) is a secondary knob.
 */

export type QualityTier = 'high' | 'medium' | 'low'

/** `auto` lets the app pick a tier, then step it down once if it measures trouble. */
export type QualityMode = 'auto' | QualityTier

export interface QualityProfile {
  tier: QualityTier
  /** Upper bound applied to window.devicePixelRatio when sizing the wheel canvas. */
  dprCap: number
  /** Frames per second the spin animation aims for. */
  targetFps: number
  /** Allow shadowBlur / shadowOffset effects (expensive in software rasterization). */
  shadows: boolean
  /** Allow the glow behind the lit LED bulbs. */
  ledGlow: boolean
  /** Multiplier applied to confetti particle counts (0 disables the burst entirely). */
  confettiScale: number
  /** Whether to keep emitting confetti for a few seconds (a stream) instead of a single burst. */
  confettiStream: boolean
  /** Minimum milliseconds between wheel tick sounds. */
  tickThrottleMs: number
  /** Allow backdrop-filter blur on the floating UI chrome. */
  backdropBlur: boolean
  /** Allow hover/active scale transforms on the wheel canvas. */
  canvasTransform: boolean
}

const PROFILES: Record<QualityTier, QualityProfile> = {
  // Full effects. A real GPU comfortably handles >2M canvas pixels per frame.
  high: {
    tier: 'high',
    dprCap: 2,
    targetFps: 60,
    shadows: true,
    ledGlow: true,
    confettiScale: 1,
    confettiStream: true,
    tickThrottleMs: 28,
    backdropBlur: true,
    canvasTransform: true,
  },
  // Backs off retina crispness and all the glow work, keeps 60fps motion.
  medium: {
    tier: 'medium',
    dprCap: 1.5,
    targetFps: 60,
    shadows: false,
    ledGlow: false,
    confettiScale: 0.6,
    confettiStream: false,
    tickThrottleMs: 38,
    backdropBlur: true,
    canvasTransform: true,
  },
  // Lowest pixel count + half frame rate + no glow/particles. Still looks fine
  // for a classroom projector because the wheel motion itself carries the effect.
  low: {
    tier: 'low',
    dprCap: 1,
    targetFps: 30,
    shadows: false,
    ledGlow: false,
    confettiScale: 0.35,
    confettiStream: false,
    tickThrottleMs: 55,
    backdropBlur: false,
    canvasTransform: false,
  },
}

export const TIER_ORDER: QualityTier[] = ['high', 'medium', 'low']

export const TIER_LABELS: Record<QualityTier, string> = {
  high: 'Cao (nét + đầy đủ hiệu ứng)',
  medium: 'Trung bình (mượt, giảm hiệu ứng nặng)',
  low: 'Thấp / Siêu nhẹ (ưu tiên tốc độ)',
}

export function getProfile(tier: QualityTier): QualityProfile {
  return PROFILES[tier] ?? PROFILES.medium
}

/** Step one tier down. Returns the same tier when already at the bottom. */
export function nextTierDown(tier: QualityTier): QualityTier {
  const idx = TIER_ORDER.indexOf(tier)
  return TIER_ORDER[Math.min(TIER_ORDER.length - 1, idx + 1)] ?? 'low'
}

function readDeviceMemory(): number | null {
  // Chromium-only, intentionally not in the TS DOM lib.
  const value = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
  return typeof value === 'number' ? value : null
}

/**
 * Static, synchronous capability guess. Uses only signals that are available
 * immediately (no micro-benchmark) so it cannot stall startup:
 *   - logical core count
 *   - deviceMemory (Chromium exposes it, capped at 8)
 *   - the display's device pixel ratio, which is the biggest predictor of how
 *     many pixels we will be asked to push per frame
 */
export function detectTier(): QualityTier {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return 'medium'

  const cores = navigator.hardwareConcurrency || 2
  const memory = readDeviceMemory()
  const dpr = window.devicePixelRatio || 1
  const area = window.screen ? window.screen.width * window.screen.height : 1920 * 1080

  let score = 0

  if (cores <= 2) score += 2
  else if (cores <= 4) score += 1

  if (memory !== null) {
    if (memory <= 2) score += 2
    else if (memory <= 4) score += 1
  }

  // A 4K-class panel at 150% scaling means ~2.5M+ canvas pixels per frame with
  // only a software rasterizer. This is the single most reliable "will stutter" signal.
  const effectiveDpr = Math.min(dpr, 2)
  const devicePixels = area * effectiveDpr * effectiveDpr
  if (devicePixels > 6_000_000) score += 2
  else if (devicePixels > 3_000_000) score += 1

  if (score >= 3) return 'low'
  if (score >= 1) return 'medium'
  return 'high'
}

/**
 * Resolve the tier actually used for rendering.
 *
 * `autoTierCap` is a *sticky* result of a runtime measurement: if the app ever
 * had to step down on this machine, that decision is remembered for future
 * launches instead of being re-probed every time (predictable > clever).
 */
export function resolveTier(mode: QualityMode, autoTierCap: QualityTier | null): QualityTier {
  if (mode !== 'auto') return mode
  if (!autoTierCap) return detectTier()

  // A remembered cap may only ever be *stricter* than what we now detect, so a
  // manual "auto" never silently upgrades back into a stutter.
  const detected = detectTier()
  return TIER_ORDER.indexOf(autoTierCap) > TIER_ORDER.indexOf(detected) ? autoTierCap : detected
}

/**
 * Rolling frame-time watchdog. Fed with the duration of rendered animation
 * frames; reports `true` exactly once when the machine is demonstrably unable
 * to keep up, so the caller can step the quality down a single notch.
 */
export class FrameWatchdog {
  private samples: number[] = []
  private readonly windowSize: number
  private readonly budgetMs: number
  private armed = true

  constructor(targetFps: number, tolerance = 1.85) {
    // Only judge frames once we have a stable window; a couple of slow first
    // frames (or a GC pause) must not trigger a downgrade.
    this.windowSize = 45
    this.budgetMs = (1000 / Math.max(1, targetFps)) * tolerance
  }

  get averageFrameMs(): number {
    if (this.samples.length === 0) return 0
    return this.samples.reduce((sum, v) => sum + v, 0) / this.samples.length
  }

  /** Returns true at most once per armed period when the device is struggling. */
  sample(frameMs: number): boolean {
    if (!this.armed) return false
    if (!Number.isFinite(frameMs) || frameMs <= 0) return false

    this.samples.push(frameMs)
    if (this.samples.length < this.windowSize) return false

    const avg = this.averageFrameMs
    const slow = this.samples.filter((v) => v > this.budgetMs).length

    // Require both a bad average AND a majority of bad frames; this filters out
    // single long frames caused by window resizing or tab re-focus.
    this.samples = []
    if (avg > this.budgetMs && slow >= this.windowSize * 0.6) {
      this.armed = false
      return true
    }
    return false
  }

  reset(): void {
    this.samples = []
  }
}

/**
 * Cached effective pixel ratio. `window.devicePixelRatio` can change when the
 * window is dragged between monitors of different scaling; re-reading it every
 * frame is cheap but recomputing the whole canvas backing store is not.
 */
export function effectiveDpr(cap: number): number {
  if (typeof window === 'undefined') return 1
  const raw = window.devicePixelRatio || 1
  return Math.max(1, Math.min(raw, cap))
}
