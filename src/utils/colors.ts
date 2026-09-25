// High contrast classroom-friendly wheel slice colors
export const SLICE_PALETTE = [
  '#ef4444', // Red
  '#f97316', // Orange
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#14b8a6', // Teal
  '#84cc16', // Lime
  '#a855f7', // Purple
  '#0284c7', // Sky
  '#e11d48', // Rose
]

export function getSliceColor(index: number, total: number): { bg: string; text: string } {
  // If the last color would match the first color, shift it
  let colorIndex = index % SLICE_PALETTE.length
  if (index === total - 1 && colorIndex === 0 && total > 1) {
    colorIndex = (colorIndex + 1) % SLICE_PALETTE.length
  }
  const bg = SLICE_PALETTE[colorIndex]
  return {
    bg,
    text: '#ffffff', // All palette colors have high contrast with white
  }
}
