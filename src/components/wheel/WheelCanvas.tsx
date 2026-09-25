import React, { useEffect, useRef, useCallback } from 'react'
import { getSliceColor } from '../../utils/colors'
import { soundManager } from '../../utils/audio'
import { triggerWinnerConfetti, resetConfetti } from '../../utils/confetti'
import { useWheelStore, type StudentItem } from '../../store/wheelStore'
import { FrameWatchdog, effectiveDpr, getProfile, resolveTier, type QualityProfile } from '../../utils/perf'
import { reportPerf } from '../../utils/perfMonitor'
import { useLatestRef } from '../../hooks/useLatestRef'

interface WheelCanvasProps {
  items: StudentItem[]
  isSpinning: boolean
  onSpinStart?: () => void
  onSpinEnd: (winner: StudentItem) => void
  spinDuration?: number // in ms, default 15000 (15s)
}

// Physical easing curve for gradual and natural deceleration (chậm dần)
// Phase 1: Smooth launch acceleration (0% to 15%)
// Phase 2: Exhilarating high-speed spin (15% to 35%)
// Phase 3: Steady, gradual, visible deceleration until stop (35% to 100%)
const ACCEL_TIME = 0.15
const CRUISE_TIME = 0.35
const DECEL_TIME = 1.0 - CRUISE_TIME // 0.65
const ALPHA = 1.35
const INV_ALPHA_PLUS_1 = 1 / (ALPHA + 1)
const I1 = (2 * ACCEL_TIME) / Math.PI
const I2 = CRUISE_TIME - ACCEL_TIME
const I3 = DECEL_TIME * INV_ALPHA_PLUS_1
const I_TOTAL = I1 + I2 + I3

function calculatePhysicalSpinProgress(p: number): {
  position: number
  velocity: number
  isCreepPhase: boolean
} {
  if (p <= 0) return { position: 0, velocity: 0, isCreepPhase: false }
  if (p >= 1) return { position: 1, velocity: 0, isCreepPhase: false }

  let position = 0
  let velocity = 0

  if (p < ACCEL_TIME) {
    const u = (p / ACCEL_TIME) * (Math.PI / 2)
    position = (I1 * (1 - Math.cos(u))) / I_TOTAL
    velocity = Math.sin(u)
  } else if (p < CRUISE_TIME) {
    position = (I1 + (p - ACCEL_TIME)) / I_TOTAL
    velocity = 1.0
  } else {
    const u = (p - CRUISE_TIME) / DECEL_TIME
    const remaining = Math.max(0, 1 - u)
    position = (I1 + I2 + I3 * (1 - Math.pow(remaining, ALPHA + 1))) / I_TOTAL
    velocity = Math.pow(remaining, ALPHA)
  }

  // The last 2-3 seconds when velocity drops below 15% is the slow creep
  const isCreepPhase = velocity < 0.14 && p > 0.75

  return { position, velocity, isCreepPhase }
}

const LED_COUNT = 32
const LED_COLORS = ['#fde047', '#38bdf8', '#f43f5e', '#a855f7']

/**
 * Canvas cannot resolve CSS custom properties, so a concrete stack is required.
 * (Previously this was `var(--font-sans, sans-serif)`, which is an invalid
 * canvas font value: the assignment was silently ignored, so every label was
 * measured and drawn at the default 10px and the auto-shrink loop could never
 * converge.)
 */
const FONT_STACK = '"Segoe UI", "Helvetica Neue", Arial, sans-serif'

function fontOf(size: number, weight = 700): string {
  const px = Number.isInteger(size) ? size : size.toFixed(1)
  return `${weight} ${px}px ${FONT_STACK}`
}

/**
 * Computes an appropriate base font size for slice labels.
 *
 * Solves "text too big on zoom > 100%":
 * 1. Proportional to wheel radius: when display scaling is 125%, 150%, 175%
 *    or the window is small, the container and radius shrink. Text must scale
 *    down proportionally instead of staying at a rigid CSS pixel size.
 * 2. Proportional to slice count: more students -> narrower slice wedges.
 * 3. Bounded by angular wedge chord: text height (including ascenders/descenders)
 *    must never exceed the angular slice height, leaving clear breathing space.
 */
function calculateBaseSliceFontSize(count: number, radius: number, hubRadius: number): number {
  if (count <= 0) return 14

  const arc = (2 * Math.PI) / count
  // Scale relative to standard desktop wheel (radius ~280px)
  const radiusScale = Math.min(1.25, Math.max(0.42, radius / 280))

  // Reference base font size for different slice counts at radius 280px
  let refSize: number
  if (count <= 4) refSize = 19
  else if (count <= 8) refSize = 16
  else if (count <= 14) refSize = 14
  else if (count <= 22) refSize = 12.5
  else if (count <= 32) refSize = 11
  else if (count <= 44) refSize = 9.5
  else refSize = 8.5

  const targetSize = refSize * radiusScale

  // Angular chord width limits:
  // At midpoint of slice, text height must not exceed 60% of chord width
  const rMid = (radius - 15 + hubRadius + 12) / 2
  const maxMidChord = rMid * arc * 0.60
  // Near the hub (narrowest part reachable by text), text cannot exceed 82% of chord
  const maxHubChord = (hubRadius + 16) * arc * 0.82
  const angularCeiling = Math.min(maxMidChord, maxHubChord)

  return Math.max(6.5, Math.min(targetSize, angularCeiling))
}

interface Geometry {
  size: number
  center: number
  radius: number
  hubRadius: number
  ledRingRadius: number
}

function geometryOf(size: number): Geometry {
  const radius = size / 2 - 32
  return {
    size,
    center: size / 2,
    radius,
    hubRadius: Math.max(34, radius * 0.17),
    ledRingRadius: radius + 14,
  }
}

function createLayer(width: number, height: number, dpr: number) {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width * dpr))
  canvas.height = Math.max(1, Math.round(height * dpr))
  const ctx = canvas.getContext('2d')
  if (ctx) ctx.scale(dpr, dpr)
  return { canvas, ctx }
}

/**
 * Builds the rotating part of the wheel ONCE per (items, size, dpr, theme, tier)
 * instead of redrawing every slice, every label and every shadow on all ~900
 * animation frames.
 *
 * The LED ring backing and its 32 *unlit* bulbs are baked in here too. Bulbs are
 * identical and evenly spaced, so their rotation is visually undetectable - only
 * the handful of *lit* bulbs are drawn per frame, at fixed screen angles.
 */
function buildFaceLayer(
  size: number,
  dpr: number,
  items: StudentItem[],
  theme: 'light' | 'dark',
  profile: QualityProfile
): HTMLCanvasElement {
  const g = geometryOf(size)
  const { canvas, ctx } = createLayer(size, size, dpr)
  if (!ctx) return canvas

  const { center, radius, hubRadius, ledRingRadius } = g

  const count = items.length
  if (count === 0) {
    ctx.beginPath()
    ctx.arc(center, center, radius, 0, 2 * Math.PI)
    ctx.fillStyle = theme === 'light' ? '#ffffff' : '#0f172a'
    ctx.fill()
    return canvas
  }

  const arc = (2 * Math.PI) / count

  // 1. Outer LED ring backing + all unlit bulbs
  ctx.beginPath()
  ctx.arc(center, center, ledRingRadius + 8, 0, 2 * Math.PI)
  ctx.fillStyle = '#090d16'
  ctx.fill()
  ctx.strokeStyle = '#1e293b'
  ctx.lineWidth = 3
  ctx.stroke()

  for (let l = 0; l < LED_COUNT; l++) {
    const ledAngle = (l * 2 * Math.PI) / LED_COUNT
    ctx.beginPath()
    ctx.arc(
      center + Math.cos(ledAngle) * ledRingRadius,
      center + Math.sin(ledAngle) * ledRingRadius,
      4.5,
      0,
      2 * Math.PI
    )
    ctx.fillStyle = '#334155'
    ctx.fill()
    ctx.strokeStyle = 'rgba(0,0,0,0.6)'
    ctx.lineWidth = 1
    ctx.stroke()
  }

  // 2. Wheel slices + labels
  ctx.save()
  ctx.translate(center, center)

  const startFontSize = calculateBaseSliceFontSize(count, radius, hubRadius)
  const maxTextWidth = radius - hubRadius - 16

  // Pre-compute every label once with its auto-fitted font size.
  // Using font weight 700 (Bold) instead of 900 (Black) gives clean, crisp
  // readability without thick glyph blobs that crowd high-zoom screens.
  const preparedLabels: { text: string; fontSize: number }[] = []
  for (let i = 0; i < count; i++) {
    let itemFontSize = startFontSize
    ctx.font = fontOf(itemFontSize, 700)
    let displayName = items[i].name

    // If long name exceeds available radial width, shrink font size step-by-step
    const minItemFontSize = Math.max(6.5, startFontSize * 0.70)
    while (ctx.measureText(displayName).width > maxTextWidth && itemFontSize > minItemFontSize) {
      itemFontSize -= 0.5
      ctx.font = fontOf(itemFontSize, 700)
    }

    if (ctx.measureText(displayName).width > maxTextWidth) {
      while (displayName.length > 2 && ctx.measureText(`${displayName}…`).width > maxTextWidth) {
        displayName = displayName.slice(0, -1)
      }
      displayName += '…'
    }

    preparedLabels.push({
      text: displayName,
      fontSize: itemFontSize,
    })
  }

  for (let i = 0; i < count; i++) {
    const sliceAngle = i * arc
    const { bg, text } = getSliceColor(i, count)
    const { text: labelText, fontSize } = preparedLabels[i]

    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.arc(0, 0, radius, sliceAngle, sliceAngle + arc)
    ctx.closePath()
    ctx.fillStyle = bg
    ctx.fill()

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)'
    ctx.lineWidth = count > 30 ? 1 : 1.5
    ctx.stroke()

    ctx.save()
    ctx.rotate(sliceAngle + arc / 2)
    ctx.fillStyle = text
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    ctx.font = fontOf(fontSize, 700)

    if (profile.shadows) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)'
      ctx.shadowBlur = Math.min(3, Math.max(1, fontSize * 0.25))
      ctx.shadowOffsetX = 1
      ctx.shadowOffsetY = 1
    }
    ctx.fillText(labelText, radius - 14, 0)
    ctx.shadowBlur = 0
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0
    ctx.restore()
  }

  // 3. Outer rim + pegs
  ctx.beginPath()
  ctx.arc(0, 0, radius, 0, 2 * Math.PI)
  ctx.lineWidth = 8
  ctx.strokeStyle = '#334155'
  ctx.stroke()

  for (let i = 0; i < count; i++) {
    const pegAngle = i * arc
    ctx.beginPath()
    ctx.arc(
      Math.cos(pegAngle) * (radius - 3),
      Math.sin(pegAngle) * (radius - 3),
      count > 35 ? 2.5 : 4,
      0,
      2 * Math.PI
    )
    ctx.fillStyle = '#ffffff'
    if (profile.shadows) {
      ctx.shadowColor = '#000000'
      ctx.shadowBlur = 2
    }
    ctx.fill()
    ctx.shadowBlur = 0
    ctx.strokeStyle = '#0f172a'
    ctx.lineWidth = 1
    ctx.stroke()
  }

  ctx.restore()
  return canvas
}

interface HubLayers {
  size: number
  idle: HTMLCanvasElement
  spinning: HTMLCanvasElement
}

/** The hub is symmetric, so it can be baked once and blitted (cheap, small area). */
function buildHubLayers(g: Geometry, dpr: number, theme: 'light' | 'dark', profile: QualityProfile): HubLayers {
  const box = (g.hubRadius + 8) * 2
  const half = box / 2

  const make = (spinning: boolean) => {
    const { canvas, ctx } = createLayer(box, box, dpr)
    if (!ctx) return canvas
    const { hubRadius } = g

    ctx.beginPath()
    ctx.arc(half, half, hubRadius + 5, 0, 2 * Math.PI)
    ctx.fillStyle = spinning ? 'rgba(245, 158, 11, 0.35)' : 'rgba(255, 255, 255, 0.15)'
    ctx.fill()

    const hubGrad = ctx.createRadialGradient(half - 6, half - 6, 6, half, half, hubRadius)
    if (spinning) {
      hubGrad.addColorStop(0, '#fef08a')
      hubGrad.addColorStop(0.6, '#f59e0b')
      hubGrad.addColorStop(1, '#b45309')
    } else if (theme === 'light') {
      hubGrad.addColorStop(0, '#ffffff')
      hubGrad.addColorStop(0.7, '#f1f5f9')
      hubGrad.addColorStop(1, '#cbd5e1')
    } else {
      hubGrad.addColorStop(0, '#f8fafc')
      hubGrad.addColorStop(0.7, '#cbd5e1')
      hubGrad.addColorStop(1, '#64748b')
    }

    ctx.beginPath()
    ctx.arc(half, half, hubRadius, 0, 2 * Math.PI)
    ctx.fillStyle = hubGrad
    if (profile.shadows) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.45)'
      ctx.shadowBlur = 10
    }
    ctx.fill()
    ctx.shadowBlur = 0
    ctx.strokeStyle = spinning ? '#fbbf24' : '#475569'
    ctx.lineWidth = 3.5
    ctx.stroke()

    const hubFontSize = Math.max(11, Math.min(20, Math.round(hubRadius * 0.42)))
    ctx.fillStyle = spinning ? '#ffffff' : '#0f172a'
    ctx.font = fontOf(hubFontSize, 800)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('QUAY', half, half)

    return canvas
  }

  return { size: box, idle: make(false), spinning: make(true) }
}

interface PointerLayer {
  canvas: HTMLCanvasElement
  width: number
  height: number
  originX: number
  originY: number
}

/** The needle wobbles every frame; baking it avoids re-running its shadow work. */
function buildPointerLayer(dpr: number, profile: QualityProfile): PointerLayer {
  const width = 64
  const height = 88
  const originX = width / 2
  const originY = 20

  const { canvas, ctx } = createLayer(width, height, dpr)
  if (!ctx) return { canvas, width, height, originX, originY }

  ctx.translate(originX, originY)

  if (profile.shadows) {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)'
    ctx.shadowBlur = 8
    ctx.shadowOffsetY = 4
  }

  ctx.beginPath()
  ctx.moveTo(0, 42)
  ctx.lineTo(-15, 0)
  ctx.lineTo(15, 0)
  ctx.closePath()

  const needleGrad = ctx.createLinearGradient(0, 0, 0, 42)
  needleGrad.addColorStop(0, '#ef4444')
  needleGrad.addColorStop(0.5, '#dc2626')
  needleGrad.addColorStop(1, '#991b1b')
  ctx.fillStyle = needleGrad
  ctx.fill()
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 2.5
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(0, 5, 7, 0, 2 * Math.PI)
  ctx.fillStyle = '#f59e0b'
  ctx.fill()
  ctx.strokeStyle = '#78350f'
  ctx.lineWidth = 2
  ctx.stroke()

  return { canvas, width, height, originX, originY }
}

export const WheelCanvas: React.FC<WheelCanvasProps> = ({
  items,
  isSpinning,
  onSpinStart,
  onSpinEnd,
  spinDuration = 15000,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  // Stable references for props so the animation loop is never rebuilt mid-spin
  const onSpinStartRef = useLatestRef(onSpinStart)
  const onSpinEndRef = useLatestRef(onSpinEnd)
  const itemsRef = useLatestRef(items)
  const spinDurationRef = useLatestRef(spinDuration)

  const qualityMode = useWheelStore((state) => state.qualityMode)
  const autoTierCap = useWheelStore((state) => state.autoTierCap)
  const applyAutoDowngrade = useWheelStore((state) => state.applyAutoDowngrade)
  const theme = useWheelStore((state) => state.theme)

  const tier = resolveTier(qualityMode, autoTierCap)
  const profile = getProfile(tier)

  const profileRef = useLatestRef(profile)
  const themeRef = useLatestRef(theme)

  // Wheel state (refs only - none of this should trigger a React re-render)
  const rotationAngleRef = useRef<number>(0)
  const animFrameIdRef = useRef<number | null>(null)
  const isCurrentlySpinningRef = useRef<boolean>(false)
  const sizeRef = useRef<number>(550)
  const pointerAngleRef = useRef<number>(0)
  const lastPegIndexRef = useRef<number>(-1)
  const lastTickTimeRef = useRef<number>(0)

  // Cached render layers
  const faceLayerRef = useRef<HTMLCanvasElement | null>(null)
  const faceKeyRef = useRef<string>('')
  const hubLayersRef = useRef<HubLayers | null>(null)
  const hubKeyRef = useRef<string>('')
  const pointerLayerRef = useRef<PointerLayer | null>(null)
  const pointerKeyRef = useRef<string>('')
  const appliedSurfaceRef = useRef<string>('')

  // Performance governance
  const watchdogRef = useRef<{ key: string; watchdog: FrameWatchdog } | null>(null)
  const lastPaintRef = useRef<number>(0)
  const spinStartRef = useRef<number>(0)
  const pausedAtRef = useRef<number>(0)
  const totalRotationRef = useRef<number>(0)
  const startAngleRef = useRef<number>(0)
  const endAngleRef = useRef<number>(0)

  /**
   * Rebuild cached layers only when their inputs actually changed. Called from
   * the paint path, so it is self-correcting: any change to items/theme/tier/
   * size/dpr is picked up on the next paint without extra bookkeeping.
   */
  const ensureLayers = useCallback((dpr: number) => {
    const p = profileRef.current
    const size = sizeRef.current
    const list = itemsRef.current
    const themeNow = themeRef.current
    const g = geometryOf(size)

    const faceKey = `${size}|${dpr}|${themeNow}|${p.tier}|${p.shadows}|${list.length}|${list.map((i) => i.name).join('\u0001')}`
    if (faceKeyRef.current !== faceKey || !faceLayerRef.current) {
      faceLayerRef.current = buildFaceLayer(size, dpr, list, themeNow, p)
      faceKeyRef.current = faceKey
    }

    const hubKey = `${g.hubRadius.toFixed(2)}|${dpr}|${themeNow}|${p.shadows}`
    if (hubKeyRef.current !== hubKey || !hubLayersRef.current) {
      hubLayersRef.current = buildHubLayers(g, dpr, themeNow, p)
      hubKeyRef.current = hubKey
    }

    const pointerKey = `${dpr}|${p.shadows}`
    if (pointerKeyRef.current !== pointerKey || !pointerLayerRef.current) {
      pointerLayerRef.current = buildPointerLayer(dpr, p)
      pointerKeyRef.current = pointerKey
    }
    // The refs below are stable handles created once, so listing them here is a
    // no-op at runtime; it just keeps the dependency contract explicit.
  }, [itemsRef, profileRef, themeRef])

  /**
   * Single frame render. Stable identity (reads only refs) so a re-render can
   * never interrupt an in-flight spin.
   *
   * Per frame this now does: one clear, ONE full-canvas rotated blit, ~5 lit LED
   * dots, one small hub blit and one small needle blit. Previously it redrew
   * every slice, every label (with measureText) and used shadowBlur on 32 LEDs,
   * every label, every peg, the hub and the needle - every single frame.
   */
  const drawFrame = useCallback(
    (angle: number, pointerTilt: number, timeMs: number, spinning: boolean, speedFactor: number) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const p = profileRef.current
      const size = sizeRef.current
      const dpr = effectiveDpr(p.dprCap)

      // Resizing the backing store reallocates the surface and resets all
      // context state, so it must only happen when something really changed.
      const surfaceKey = `${size}|${dpr}`
      if (appliedSurfaceRef.current !== surfaceKey) {
        canvas.width = Math.max(1, Math.round(size * dpr))
        canvas.height = Math.max(1, Math.round(size * dpr))
        canvas.style.width = `${size}px`
        canvas.style.height = `${size}px`
        appliedSurfaceRef.current = surfaceKey
      }

      ensureLayers(dpr)

      const g = geometryOf(size)
      const { center, ledRingRadius } = g

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, size, size)

      const face = faceLayerRef.current
      if (!face) return

      // Rotated wheel face (slices, labels, pegs, rim, LED ring backing)
      ctx.save()
      ctx.translate(center, center)
      ctx.rotate(angle)
      ctx.drawImage(face, -size / 2, -size / 2, size, size)
      ctx.restore()

      // Lit LED chase lights, at fixed screen angles
      const count = itemsRef.current.length
      if (count > 0) {
        const ledPhase = spinning
          ? (timeMs * 0.02 * (1 + speedFactor * 4)) % LED_COUNT
          : (timeMs * 0.002) % LED_COUNT

        for (let l = 0; l < LED_COUNT; l++) {
          const distFromPhase = Math.abs(l - ledPhase)
          const isLit = distFromPhase < 2.5 || distFromPhase > LED_COUNT - 2.5
          if (!isLit) continue

          const ledAngle = (l * 2 * Math.PI) / LED_COUNT
          const bulbColor = LED_COLORS[l % LED_COLORS.length]

          ctx.beginPath()
          ctx.arc(
            center + Math.cos(ledAngle) * ledRingRadius,
            center + Math.sin(ledAngle) * ledRingRadius,
            4.5,
            0,
            2 * Math.PI
          )
          ctx.fillStyle = bulbColor
          if (p.ledGlow) {
            ctx.shadowColor = bulbColor
            ctx.shadowBlur = 8
          }
          ctx.fill()
          ctx.shadowBlur = 0
          ctx.strokeStyle = 'rgba(0,0,0,0.6)'
          ctx.lineWidth = 1
          ctx.stroke()
        }
      }

      // Center hub
      const hub = hubLayersRef.current
      if (hub) {
        const sprite = spinning ? hub.spinning : hub.idle
        ctx.drawImage(sprite, center - hub.size / 2, center - hub.size / 2, hub.size, hub.size)
      }

      // Needle (spring wobble)
      const pointer = pointerLayerRef.current
      if (pointer) {
        ctx.save()
        ctx.translate(center, center - g.radius - 18)
        ctx.rotate(pointerTilt)
        ctx.drawImage(
          pointer.canvas,
          -pointer.originX,
          -pointer.originY,
          pointer.width,
          pointer.height
        )
        ctx.restore()
      }
    },
    [ensureLayers, itemsRef, profileRef]
  )

  const paintCurrent = useCallback(() => {
    drawFrame(rotationAngleRef.current, pointerAngleRef.current, 0, isCurrentlySpinningRef.current, 0)
  }, [drawFrame])

  // Track the container size. A ResizeObserver also covers the sidebar being
  // toggled open/closed, which a window 'resize' listener misses.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const applySize = () => {
      const { clientWidth, clientHeight } = el
      const next = Math.max(340, Math.min(clientWidth, clientHeight, 860))
      if (Math.abs(next - sizeRef.current) < 0.5) return
      sizeRef.current = next
      paintCurrent()
    }

    applySize()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', applySize)
      return () => window.removeEventListener('resize', applySize)
    }
    const observer = new ResizeObserver(applySize)
    observer.observe(el)
    return () => observer.disconnect()
  }, [paintCurrent])

  // Repaint (and rebuild the cached layers) whenever the wheel inputs change
  useEffect(() => {
    paintCurrent()
  }, [paintCurrent, items, theme, tier])

  const finishSpin = useCallback((winner: StudentItem) => {
    isCurrentlySpinningRef.current = false
    reportPerf({ spinning: false })
    const p = profileRef.current
    soundManager.playWinnerFanfare()
    if (p.confettiScale > 0) triggerWinnerConfetti(p)
    onSpinEndRef.current(winner)
  }, [onSpinEndRef, profileRef])

  const startSpin = useCallback(() => {
    const currentItems = itemsRef.current
    if (isCurrentlySpinningRef.current || currentItems.length === 0) return

    isCurrentlySpinningRef.current = true
    const p = profileRef.current
    soundManager.setTickThrottleMs(p.tickThrottleMs)
    soundManager.unlock()
    soundManager.playSpinStart()
    reportPerf({ spinning: true, tier: p.tier, mode: qualityMode, downgraded: autoTierCap !== null })
    onSpinStartRef.current?.()

    const count = currentItems.length
    const arc = (2 * Math.PI) / count

    // Pick random winner
    const winnerIndex = Math.floor(Math.random() * count)
    const winner = currentItems[winnerIndex]

    // Pointer is at 12 o'clock, which is 1.5 * Math.PI.
    // Slice winnerIndex occupies [winnerIndex * arc, (winnerIndex + 1) * arc].
    const jitter = (Math.random() - 0.5) * arc * 0.4
    const targetSliceAngle = (winnerIndex + 0.5) * arc + jitter

    const currentDuration = spinDurationRef.current
    const durationSec = currentDuration / 1000
    const baseTurns = Math.max(8, Math.round(durationSec * 1.4))
    const extraTurns = (baseTurns + Math.floor(Math.random() * 2)) * (2 * Math.PI)

    const currentAngle = rotationAngleRef.current % (2 * Math.PI)
    const targetAngleNormalized = (1.5 * Math.PI - targetSliceAngle) % (2 * Math.PI)
    let angleDifference = targetAngleNormalized - currentAngle
    if (angleDifference < 0) angleDifference += 2 * Math.PI

    const startAngle = rotationAngleRef.current
    const totalRotation = extraTurns + angleDifference

    startAngleRef.current = startAngle
    totalRotationRef.current = totalRotation
    endAngleRef.current = startAngle + totalRotation
    spinStartRef.current = performance.now()
    pausedAtRef.current = 0

    lastPegIndexRef.current = -1
    lastTickTimeRef.current = 0
    lastPaintRef.current = 0

    // A downgrade may have happened on a previous spin; start clean each time.
    watchdogRef.current = {
      key: `${p.tier}|${p.targetFps}`,
      watchdog: new FrameWatchdog(p.targetFps),
    }

    const animate = (now: number) => {
      // Pause cleanly while the window is minimised / hidden, and shift the time
      // base forward so the wheel does not jump when it comes back.
      if (typeof document !== 'undefined' && document.hidden) {
        pausedAtRef.current = now
        animFrameIdRef.current = requestAnimationFrame(animate)
        return
      }
      if (pausedAtRef.current > 0) {
        spinStartRef.current += now - pausedAtRef.current
        pausedAtRef.current = 0
      }

      const activeProfile = profileRef.current

      // Frame-rate governor: on low-end profiles we deliberately paint at 30fps
      // instead of 60. The rotation math below is time-based, so motion stays
      // perfectly smooth and only the sampling rate changes.
      const frameBudget = 1000 / activeProfile.targetFps
      if (lastPaintRef.current > 0 && now - lastPaintRef.current < frameBudget - 1.5) {
        animFrameIdRef.current = requestAnimationFrame(animate)
        return
      }
      lastPaintRef.current = now

      const p01 = Math.min(1, (now - spinStartRef.current) / currentDuration)

      const { position, velocity, isCreepPhase } = calculatePhysicalSpinProgress(p01)
      const currentRotation = startAngleRef.current + totalRotationRef.current * position
      rotationAngleRef.current = currentRotation

      // Peg collision -> tick sound
      const normalizedAngle = ((currentRotation % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
      const relativeAngle =
        (((1.5 * Math.PI - normalizedAngle) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
      const currentPegIndex = Math.floor(relativeAngle / arc)

      if (currentPegIndex !== lastPegIndexRef.current) {
        lastPegIndexRef.current = currentPegIndex

        if (isCreepPhase) {
          pointerAngleRef.current = -0.42
          soundManager.playCreepClack()
          lastTickTimeRef.current = now
        } else if (now - lastTickTimeRef.current >= activeProfile.tickThrottleMs) {
          pointerAngleRef.current = -0.25 * Math.min(1, velocity * 1.2)
          soundManager.playTick(0.8 + velocity * 0.7)
          lastTickTimeRef.current = now
        }
      } else {
        // Needle spring recovery towards neutral
        pointerAngleRef.current *= 0.82
      }

      const renderStart = performance.now()
      drawFrame(currentRotation, pointerAngleRef.current, now, true, velocity)
      const renderMs = performance.now() - renderStart

      reportPerf({ frameMs: renderMs })

      // Detect a machine that cannot keep up and step quality down one notch.
      const watchdog = watchdogRef.current
      if (watchdog && watchdog.key === `${activeProfile.tier}|${activeProfile.targetFps}`) {
        if (watchdog.watchdog.sample(renderMs)) {
          applyAutoDowngrade()
          reportPerf({ downgraded: true })
        }
      }

      if (p01 < 1) {
        animFrameIdRef.current = requestAnimationFrame(animate)
      } else {
        // Snap to the exact finish angle
        rotationAngleRef.current = endAngleRef.current
        pointerAngleRef.current = 0
        if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current)
        animFrameIdRef.current = null
        drawFrame(endAngleRef.current, 0, now, false, 0)

        // Give the eye a moment to see the needle rest on the winning slice,
        // then show the popup. Note the spin is already over, so the spin flag is
        // cleared here rather than after the delay.
        isCurrentlySpinningRef.current = false
        window.setTimeout(() => finishSpin(winner), 350)
      }
    }

    animFrameIdRef.current = requestAnimationFrame(animate)
  }, [
    applyAutoDowngrade,
    autoTierCap,
    drawFrame,
    finishSpin,
    itemsRef,
    onSpinStartRef,
    profileRef,
    qualityMode,
    spinDurationRef,
  ])

  useEffect(() => {
    if (isSpinning && !isCurrentlySpinningRef.current) {
      startSpin()
    }
  }, [isSpinning, startSpin])

  // Release timers, animation frames and the confetti canvas on unmount
  useEffect(() => {
    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current)
      resetConfetti()
    }
  }, [])

  const interactive = !isSpinning

  return (
    <div
      ref={containerRef}
      className="relative flex items-center justify-center w-full h-full max-w-[860px] max-h-[860px] aspect-square p-1"
    >
      <canvas
        ref={canvasRef}
        onClick={startSpin}
        className={`cursor-pointer ${
          interactive ? 'pointer-events-auto' : 'pointer-events-none'
        } ${profile.canvasTransform && interactive ? 'transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99]' : ''}`}
      />
    </div>
  )
}
