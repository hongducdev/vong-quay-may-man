import { createStore } from 'zustand/vanilla'
import type { QualityMode, QualityTier } from './perf'

/**
 * Lightweight, throttled performance telemetry.
 *
 * Kept outside React on purpose: the spin loop samples every frame, but we only
 * push an update ~2x/second so nothing re-renders 60 times a second. The HUD is
 * the only subscriber, so it costs nothing when it is turned off.
 *
 * This exists because low-end GPU behaviour genuinely cannot be validated by
 * code review or a passing build - someone has to look at a real weak machine.
 */

export interface PerfSample {
  fps: number
  /** Average render time of one animation frame, in milliseconds. */
  frameMs: number
  tier: QualityTier
  mode: QualityMode
  /** True when the tier was stepped down by the runtime watchdog. */
  downgraded: boolean
  spinning: boolean
}

interface PerfState extends PerfSample {
  report: (sample: Partial<PerfSample>) => void
}

const UPDATE_INTERVAL_MS = 500

let lastPush = 0
let frames = 0
let frameMsTotal = 0

export const perfMonitor = createStore<PerfState>()((set) => ({
  fps: 0,
  frameMs: 0,
  tier: 'medium',
  mode: 'auto',
  downgraded: false,
  spinning: false,

  report: (sample) => {
    if (typeof sample.frameMs === 'number') {
      frames += 1
      frameMsTotal += sample.frameMs
    }

    const now = performance.now()
    if (now - lastPush < UPDATE_INTERVAL_MS) {
      // Still let non-metric flags (tier/mode changes) through immediately so
      // an auto-downgrade is visible right away.
      if (sample.tier === undefined && sample.mode === undefined && sample.downgraded === undefined) {
        return
      }
      set(sample)
      return
    }

    const fps = frames > 0 ? Math.round((frames * 1000) / (now - lastPush)) : 0
    const frameMs = frames > 0 ? frameMsTotal / frames : 0
    frames = 0
    frameMsTotal = 0
    lastPush = now

    set({ ...sample, fps, frameMs })
  },
}))

export function reportPerf(sample: Partial<PerfSample>) {
  perfMonitor.getState().report(sample)
}
