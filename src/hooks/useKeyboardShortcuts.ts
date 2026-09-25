import { useEffect } from 'react'
import { useWheelStore } from '../store/wheelStore'

interface ShortcutOptions {
  onSpinTrigger: () => void
  onCloseModals?: () => void
}

export function useKeyboardShortcuts({ onSpinTrigger, onCloseModals }: ShortcutOptions) {
  const isSpinning = useWheelStore((state) => state.isSpinning)
  const availableItems = useWheelStore((state) => state.availableItems)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Do not trigger shortcuts if user is typing in an input or textarea
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      if (e.code === 'Space') {
        e.preventDefault()
        if (!isSpinning && availableItems.length > 0) {
          onSpinTrigger()
        }
      } else if (e.code === 'Escape') {
        if (onCloseModals) {
          onCloseModals()
        }
      } else if (e.code === 'F11') {
        e.preventDefault()
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {})
        } else {
          document.exitFullscreen().catch(() => {})
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isSpinning, availableItems.length, onSpinTrigger, onCloseModals])
}
