import confetti from 'canvas-confetti'
import type { QualityProfile } from './perf'

/**
 * Celebration confetti, scaled to the device.
 *
 * Two things matter on low-end machines:
 *  1. Particle counts and `ticks` control how much math + fill work happens
 *     per frame on a full-screen canvas.
 *  2. The confetti canvas is a full-viewport composited layer. canvas-confetti
 *     keeps it in the DOM forever, so on a weak GPU it permanently costs
 *     memory and compositing. We therefore tear it down once the burst is done.
 */

const PALETTE = ['#ff0055', '#0099ff', '#00ff66', '#ffdd00', '#ff00ff']

const STREAM_DURATION_MS = 3500
const STREAM_INTERVAL_MS = 250

let canvas: HTMLCanvasElement | null = null
let instance: ReturnType<typeof confetti.create> | null = null
let streamTimer: number | null = null
let activeToken = 0

function getInstance(): ReturnType<typeof confetti.create> {
  if (instance && canvas && canvas.isConnected) return instance

  const el = document.createElement('canvas')
  el.style.position = 'fixed'
  el.style.top = '0'
  el.style.left = '0'
  el.style.width = '100%'
  el.style.height = '100%'
  el.style.pointerEvents = 'none'
  el.style.zIndex = '9999'
  document.body.appendChild(el)

  canvas = el
  instance = confetti.create(el, { resize: true, useWorker: false })
  return instance
}

function stopStream() {
  if (streamTimer !== null) {
    clearInterval(streamTimer)
    streamTimer = null
  }
}

function teardown(token: number, delayMs: number) {
  window.setTimeout(() => {
    // A newer spin started, or the stream is still emitting - keep the canvas.
    if (token !== activeToken || streamTimer !== null) return
    instance?.reset()
    canvas?.remove()
    instance = null
    canvas = null
  }, delayMs)
}

export function triggerWinnerConfetti(profile: QualityProfile) {
  const scale = profile.confettiScale
  if (scale <= 0) return

  // Cancel any burst still running from a previous spin, otherwise a short
  // spin duration (3s) lets bursts stack up into a growing particle backlog.
  stopStream()
  const token = ++activeToken

  let fire: ReturnType<typeof confetti.create>
  try {
    fire = getInstance()
  } catch {
    return // No canvas available (very unusual) - never break the spin flow.
  }

  const common = {
    zIndex: 9999,
    colors: PALETTE,
    disableForReducedMotion: true,
  }

  if (profile.confettiStream) {
    const end = Date.now() + STREAM_DURATION_MS
    const streamDefaults = {
      ...common,
      startVelocity: 30,
      spread: 360,
      // Shorter-lived particles = less per-frame simulation work.
      ticks: Math.round(90 * scale),
    }

    streamTimer = window.setInterval(() => {
      const timeLeft = end - Date.now()
      if (timeLeft <= 0) {
        stopStream()
        teardown(token, 400)
        return
      }
      const particleCount = Math.max(2, Math.round(50 * scale * (timeLeft / STREAM_DURATION_MS)))
      fire({ ...streamDefaults, particleCount, origin: { x: 0.15, y: 0.7 } })
      fire({ ...streamDefaults, particleCount, origin: { x: 0.85, y: 0.7 } })
    }, STREAM_INTERVAL_MS)
  }

  // Immediate blast from the centre for every tier - this is the celebration
  // moment, so it is the last thing we would ever drop.
  const burst = Math.max(24, Math.round((profile.confettiStream ? 100 : 130) * scale))
  const result = fire({
    ...common,
    particleCount: burst,
    spread: 100,
    startVelocity: 34,
    origin: { y: 0.5 },
    ticks: Math.round(120 * Math.max(0.4, scale)),
  })

  // When the burst settles (and no stream is running), release the canvas.
  result?.then(() => teardown(token, 200)).catch(() => {})
}

/** Stop any running celebration and release the confetti canvas. */
export function resetConfetti() {
  stopStream()
  activeToken++
  instance?.reset()
  canvas?.remove()
  instance = null
  canvas = null
}
