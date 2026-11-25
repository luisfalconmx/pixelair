const UNITS = ['B', 'KB', 'MB', 'GB'] as const

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024
    unit++
  }
  const digits = unit === 0 || value >= 100 ? 0 : value >= 10 ? 1 : 2
  return `${value.toFixed(digits)} ${UNITS[unit]}`
}

/** Percentage saved (positive) or grown (negative) going from `original` to `optimized`. */
export function savingsPercent(original: number, optimized: number): number {
  if (original <= 0) return 0
  return Math.round((1 - optimized / original) * 1000) / 10
}

/** Maximum pixels for a single output (≈ 64 MP) to keep WASM memory bounded. */
export const MAX_OUTPUT_PIXELS = 64_000_000

export function scaledDimensions(width: number, height: number, scale: number) {
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

export function exceedsPixelLimit(width: number, height: number): boolean {
  return width * height > MAX_OUTPUT_PIXELS
}
