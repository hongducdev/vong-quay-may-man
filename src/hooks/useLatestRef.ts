import { useEffect, useRef, type RefObject } from 'react'

/**
 * Keeps a ref pointing at the latest render value.
 *
 * The wheel animation loop must be able to read current props/state without
 * being torn down and rebuilt on every render (that would interrupt a spin).
 * Writing the ref here - in an effect, after render - rather than directly
 * during render keeps the component safe under React's concurrent rendering.
 *
 * The ref is seeded with the initial value, so it is always readable; it is
 * only ever read from effects, timers and rAF callbacks, which all run after
 * this effect has flushed.
 */
export function useLatestRef<T>(value: T): RefObject<T> {
  const ref = useRef(value)
  useEffect(() => {
    ref.current = value
  })
  return ref
}
